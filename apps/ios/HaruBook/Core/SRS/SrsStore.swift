import Foundation
import Observation

/// Leitner 스타일 SRS — 웹 `src/lib/srs.ts` 미러.
///
/// 평가는 2단계: "몰라"(again) / "알아"(good).
///  - 새 단어: 저장된 기록 없음, isDue=true (즉시 학습 대상).
///  - "몰라"(again): level=0, due=+5분 — "모르는 단어" 탭에서 다시 보임.
///  - "알아"(good): level+1, 레벨별 간격만큼 뒤로 밀림.
/// 최대 레벨 3 (7일 주기). 이후도 7일 고정.
///
/// 저장소는 `UserDefaults` 단말 단위 — COPPA Level-1 정책상 아동 학습 진도 서버 업로드 안 함.
/// 웹은 localStorage이지만 키 호환 불필요(서버 동기 없음).
struct SrsItem: Codable, Sendable {
    var level: Int
    /// epoch ms
    var dueAtMs: Double
    /// epoch ms — 0이면 평가 이력 없음.
    var lastGradedAtMs: Double
}

enum SrsGrade: String, Sendable {
    case again
    case good
}

/// 단어 카드의 학습 상태 — UI 칩 표시용 의미 단위 분류.
enum VocabCardState: String, Sendable {
    case new        // 평가 이력 없음 — 처음 만나는 단어
    case relearning // "몰라요"로 떨어진 단어 (level 0 + 평가 이력)
    case learning   // 학습 중 (level 1~maxLevel-1)
    case mastered   // 마스터 (level == maxLevel)
}

/// 단어 키 정규화 — 대소문자·양끝 공백·구두점 무시. 웹과 동일.
func srsNormalizeKey(_ word: String) -> String {
    let trimmed = word.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
    let punctuation = CharacterSet(charactersIn: ".,!?;:\"'")
    return trimmed.unicodeScalars.filter { !punctuation.contains($0) }.reduce(into: "") {
        $0.append(Character($1))
    }
}

/// SwiftUI가 `items` 변경(평가 결과 저장)을 추적하도록 `@Observable`. 이전엔 일반 class라
/// `dueCount` / `unknownCount` 같은 computed 값이 평가 후에도 stale 상태로 남아
/// "오늘 학습" 배지가 줄지 않는 증상이 있었다.
@Observable
@MainActor
final class SrsStore {
    /// 인터벌(ms): 5분 / 1일 / 3일 / 7일.
    @ObservationIgnored static let intervalMs: [Double] = [
        5 * 60 * 1000,
        24 * 60 * 60 * 1000,
        3 * 24 * 60 * 60 * 1000,
        7 * 24 * 60 * 60 * 1000,
    ]
    @ObservationIgnored static let maxLevel = 3

    @ObservationIgnored private let profileId: Int
    @ObservationIgnored private let defaults: UserDefaults
    private var items: [String: SrsItem]

    init(profileId: Int, defaults: UserDefaults = .standard) {
        self.profileId = profileId
        self.defaults = defaults
        self.items = Self.load(profileId: profileId, defaults: defaults)
    }

    private static func storageKey(profileId: Int) -> String {
        "srs.profile.\(profileId)"
    }

    private static func load(profileId: Int, defaults: UserDefaults) -> [String: SrsItem] {
        guard let data = defaults.data(forKey: storageKey(profileId: profileId)) else {
            return [:]
        }
        return (try? JSONDecoder().decode([String: SrsItem].self, from: data)) ?? [:]
    }

    private func persist() {
        guard let data = try? JSONEncoder().encode(items) else { return }
        defaults.set(data, forKey: Self.storageKey(profileId: profileId))
    }

    // MARK: - Public API

    /// 단어 평가 후 다음 간격 계산 + 영속화. 동시에 서버 vocab_progress + grade_log에 미러링.
    /// 서버 동기는 fire-and-forget — 오프라인/장애 시에도 단말 학습 흐름은 막지 않는다.
    @discardableResult
    func grade(_ word: String, _ grade: SrsGrade) -> SrsItem {
        let key = srsNormalizeKey(word)
        let prev = items[key] ?? SrsItem(level: 0, dueAtMs: 0, lastGradedAtMs: 0)
        let nowMs = Date().timeIntervalSince1970 * 1000

        let level: Int
        switch grade {
        case .again:
            level = 0
        case .good:
            level = min(Self.maxLevel, prev.level + 1)
        }
        let interval = Self.intervalMs[level]
        let next = SrsItem(level: level, dueAtMs: nowMs + interval, lastGradedAtMs: nowMs)
        items[key] = next
        persist()

        // 서버 미러 — async detached. 단어/grade만 전송, 위치/시간은 서버가 재계산해도 동일 결과.
        let profileId = self.profileId
        let originalWord = word
        Task {
            await Self.postGrade(profileId: profileId, word: originalWord, grade: grade)
        }

        return next
    }

    /// 서버 vocab_progress를 받아 로컬과 머지 — `lastGradedAtMs`가 더 큰 쪽 사용. 다른 디바이스에서
    /// 평가한 진도가 있으면 그게 반영된다. 부팅 시 한 번 호출하면 충분.
    func hydrateFromServer() async {
        do {
            let response: VocabProgressResponse = try await APIClient.shared.send(
                Endpoint(
                    path: "/api/vocab/progress",
                    method: .get,
                    query: [URLQueryItem(name: "profileId", value: String(profileId))],
                ),
            )
            var merged = items
            for row in response.progress {
                let cur = merged[row.wordKey]
                if cur == nil || row.lastGradedAtMs > (cur?.lastGradedAtMs ?? 0) {
                    merged[row.wordKey] = SrsItem(
                        level: row.level,
                        dueAtMs: row.dueAtMs,
                        lastGradedAtMs: row.lastGradedAtMs,
                    )
                }
            }
            items = merged
            persist()
        } catch {
            // 오프라인이면 로컬만으로 동작. 다음 hydrate 시 시도.
        }
    }

    private static func postGrade(profileId: Int, word: String, grade: SrsGrade) async {
        struct Body: Encodable {
            let profileId: Int
            let word: String
            let grade: String
        }
        struct Response: Decodable {}
        do {
            let _: Response = try await APIClient.shared.send(
                Endpoint(
                    path: "/api/vocab/grade",
                    method: .post,
                    body: Body(profileId: profileId, word: word, grade: grade.rawValue),
                ),
            )
        } catch {
            // 사용자 흐름 미차단. 다음 hydrate 호출 시 서버에 누락된 평가는 메워지지 않지만
            // 통계가 잠시 비는 수준에서 끝남.
        }
    }

    /// 키 기준 현재 상태 조회.
    func item(for word: String) -> SrsItem? {
        items[srsNormalizeKey(word)]
    }

    /// "모르는 단어" — 평가 이력이 있고 현재 레벨이 0인 단어.
    func isUnknown(_ word: String) -> Bool {
        guard let it = item(for: word) else { return false }
        return it.level == 0 && it.lastGradedAtMs > 0
    }

    /// 복습 대상인가 — 새 단어이거나 dueAt 도래.
    func isDue(_ word: String, nowMs: Double = Date().timeIntervalSince1970 * 1000) -> Bool {
        guard let it = item(for: word) else { return true }
        return it.dueAtMs <= nowMs
    }

    /// 평가 이력이 한 번이라도 있는가 — 통계용.
    func hasHistory(_ word: String) -> Bool {
        guard let it = item(for: word) else { return false }
        return it.lastGradedAtMs > 0
    }

    /// 마스터 — 최대 레벨에 도달한 단어. "전체"/"오늘 학습" 카운트에서 제외해 학습 진도가
    /// 시각적으로 줄어들도록 한다.
    func isMastered(_ word: String) -> Bool {
        guard let it = item(for: word) else { return false }
        return it.level >= Self.maxLevel
    }

    /// 카드 상태 분류 — UI 칩 표시용. new / relearning / learning / mastered.
    func cardState(for word: String) -> VocabCardState {
        guard let it = item(for: word) else { return .new }
        if it.level >= Self.maxLevel { return .mastered }
        if it.level == 0 { return .relearning }
        return .learning
    }

    /// 단어가 처음 만나는 단어(평가 이력 없음)인지. review deck에서 새 단어를 앞에 정렬할 때 사용.
    func isNew(_ word: String) -> Bool {
        return item(for: word) == nil
    }

    /// 오늘(로컬 자정 이후) 평가한 단어 수 — 일일 학습 목표 진행률 표시용.
    func gradedTodayCount() -> Int {
        let startOfTodayMs = Self.startOfTodayMs()
        return items.values.filter { $0.lastGradedAtMs >= startOfTodayMs }.count
    }

    private static func startOfTodayMs() -> Double {
        let cal = Calendar.current
        let start = cal.startOfDay(for: Date())
        return start.timeIntervalSince1970 * 1000
    }
}

/// 서버 `GET /api/vocab/progress` 응답 — SrsStore에서만 사용.
private struct VocabProgressResponse: Decodable {
    let progress: [Row]
    struct Row: Decodable {
        let wordKey: String
        let level: Int
        let dueAtMs: Double
        let lastGradedAtMs: Double
    }
}
