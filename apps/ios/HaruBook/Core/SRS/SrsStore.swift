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

    /// 단어 평가 후 다음 간격 계산 + 영속화.
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
        return next
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
}
