import Foundation
import Observation
import AVFoundation

/// HomeRouter NavigationStack 경로 값.
struct VocabDestination: Hashable {
    let profileId: Int
}

/// 단어장 플래시카드 + SRS 상태 관리.
@Observable
@MainActor
final class VocabViewModel {
    enum Tab: String, CaseIterable, Identifiable {
        case review
        case unknown
        case all
        var id: String { rawValue }
        var label: String {
            switch self {
            case .review: return "오늘 학습"
            // "몰라요" 누른 단어 = relearning. "모르는 단어"는 평가 이력 없는 새 단어와 혼동돼 의미 명확화.
            case .unknown: return "다시 학습"
            case .all: return "전체"
            }
        }
    }

    /// 일일 학습 목표. 한 세션의 review deck 상한과 동일.
    static let dailyGoal: Int = 20

    private(set) var entries: [VocabEntry] = []
    private(set) var srs: SrsStore
    var isLoading: Bool = false
    var error: String?

    var tab: Tab = .review {
        didSet {
            index = 0
            isFlipped = false
        }
    }
    var index: Int = 0
    var isFlipped: Bool = false
    var isSpeaking: Bool = false

    let profileId: Int

    private var audioCache: [String: String] = [:]
    @ObservationIgnored private var audioPlayer: AVAudioPlayer?

    init(profileId: Int) {
        self.profileId = profileId
        self.srs = SrsStore(profileId: profileId)
    }

    func load() async {
        isLoading = true
        defer { isLoading = false }
        // 단어 목록과 서버 SRS 진도를 병렬로 받아 다른 디바이스에서 평가한 진도가 통합된 상태로 시작.
        async let serverHydrate: Void = srs.hydrateFromServer()
        do {
            let response: VocabResponse = try await APIClient.shared.send(
                Endpoint(
                    path: "/api/vocab",
                    method: .get,
                    query: [URLQueryItem(name: "profileId", value: String(profileId))],
                ),
            )
            await serverHydrate
            // word + meaning 단위 dedup (웹과 동일).
            var seen = Set<String>()
            self.entries = response.entries.filter { e in
                let key = "\(e.word.lowercased())::\(e.meaning)"
                return seen.insert(key).inserted
            }
            self.index = 0
            self.isFlipped = false
            self.error = nil
        } catch {
            self.error = "단어장을 불러오지 못했어요."
            await serverHydrate
        }
    }

    // MARK: - Deck composition

    /// "오늘 학습" 세션의 최대 단어 수. 웹과 동일.
    static let reviewDeckLimit: Int = 20

    /// 마스터 제외 + tab별 deck.
    /// "오늘 학습"은 새 단어를 먼저, 그 다음 복습 도래 단어를 배치 — 학습 곡선을 자연스럽게.
    var deck: [VocabEntry] {
        switch tab {
        case .all:
            return entries.filter { !srs.isMastered($0.word) }
        case .unknown:
            return entries.filter { srs.isUnknown($0.word) }
        case .review:
            let candidates = entries.filter { srs.isDue($0.word) && !srs.isMastered($0.word) }
            // 새 단어 우선, 동일 카테고리 내에서는 원본 순서 유지(stable).
            let sorted = candidates.sorted { a, b in
                srs.isNew(a.word) && !srs.isNew(b.word)
            }
            return Array(sorted.prefix(Self.reviewDeckLimit))
        }
    }

    var current: VocabEntry? {
        let d = deck
        guard d.indices.contains(index) else { return nil }
        return d[index]
    }

    /// "오늘 학습" 탭 배지 — 마스터 제외 + `reviewDeckLimit` 상한. deck 길이와 일치.
    var dueCount: Int {
        let raw = entries.filter { srs.isDue($0.word) && !srs.isMastered($0.word) }.count
        return Swift.min(raw, Self.reviewDeckLimit)
    }
    var unknownCount: Int { entries.filter { srs.isUnknown($0.word) }.count }
    /// "전체" 탭 배지 — 마스터 제외한 남은 학습 대상. 평가로 maxLevel 도달 시 줄어든다.
    var remainingCount: Int { entries.filter { !srs.isMastered($0.word) }.count }
    /// 마스터한 단어 수 — 학습 진도 표시용.
    var masteredCount: Int { entries.filter { srs.isMastered($0.word) }.count }

    /// 오늘(로컬 자정 이후) 평가한 단어 수. 일일 목표 진행률 표시용.
    var gradedTodayCount: Int { srs.gradedTodayCount() }

    /// 일일 목표 진행률 (0.0 ~ 1.0). UI에서 ProgressView로 표시.
    var dailyGoalProgress: Double {
        min(1.0, Double(gradedTodayCount) / Double(Self.dailyGoal))
    }

    /// "오늘 학습" 세션 종료 여부 — review 탭에서 due 단어가 없고 오늘 한 단어라도 평가했을 때.
    /// 진입 직후 0/0이면 아직 시작 안 한 상태로 보고 false.
    var isSessionComplete: Bool {
        tab == .review && deck.isEmpty && gradedTodayCount > 0
    }

    // MARK: - Navigation

    func flip() { isFlipped.toggle() }

    func go(_ delta: Int) {
        let max = deck.count - 1
        index = Swift.max(0, Swift.min(max, index + delta))
        isFlipped = false
    }

    func shuffle() {
        entries.shuffle()
        index = 0
        isFlipped = false
    }

    // MARK: - SRS grading

    func grade(_ g: SrsGrade) {
        guard let cur = current else { return }
        _ = srs.grade(cur.word, g)
        isFlipped = false

        if g == .again {
            // 현재 단어를 entries 끝으로 이동 — 즉시 한 번 더 보게.
            let key = srsNormalizeKey(cur.word)
            entries.removeAll { srsNormalizeKey($0.word) == key }
            entries.append(cur)
            // index는 같은 위치(이제 다른 단어 노출).
            index = Swift.min(index, Swift.max(0, deck.count - 1))
        } else {
            // 한 칸 전진. 마지막이면 유지.
            index = Swift.min(index + 1, Swift.max(0, deck.count - 1))
        }
    }

    // MARK: - Word audio

    /// `POST /api/tts/word`로 단어 wav 경로를 받고 즉시 재생.
    /// 같은 단어는 메모리 캐시 — API 재호출 안 함.
    func speak(_ word: String) async {
        guard !isSpeaking else { return }
        isSpeaking = true
        defer { isSpeaking = false }
        do {
            let path: String
            if let cached = audioCache[word] {
                path = cached
            } else {
                let response: WordTtsResponse = try await APIClient.shared.send(
                    Endpoint(
                        path: "/api/tts/word",
                        method: .post,
                        body: WordTtsRequest(text: word),
                    ),
                )
                path = response.audioPath
                audioCache[word] = path
            }

            let url = AppConfig.apiBaseURL.appendingPathComponent(path)
            var request = URLRequest(url: url)
            if let token = AuthState.shared.peekAccessToken() {
                request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
            }
            let (data, _) = try await URLSession.shared.data(for: request)

            try AVAudioSession.sharedInstance().setCategory(.playback, mode: .spokenAudio)
            try AVAudioSession.sharedInstance().setActive(true)

            let player = try AVAudioPlayer(data: data)
            player.rate = 0.85
            player.enableRate = true
            player.prepareToPlay()
            player.play()
            self.audioPlayer = player
        } catch {
            // 발음 실패는 사용자 흐름을 막지 않는다. 콘솔만.
            print("[vocab] speak failed: \(error)")
        }
    }
}

private struct WordTtsRequest: Encodable {
    let text: String
}

private struct WordTtsResponse: Decodable {
    let audioPath: String
}
