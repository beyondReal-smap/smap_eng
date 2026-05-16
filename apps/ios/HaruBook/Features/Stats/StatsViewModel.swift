import Foundation
import Observation

/// HomeRouter NavigationStack 경로 값.
struct StatsDestination: Hashable {
    let profileId: Int
}

/// `/api/learning-summary` + `/api/books` (stats 포함) + `/api/vocab`을 병렬 로드.
/// SRS 상태는 단말 UserDefaults에서 읽는다.
@Observable
@MainActor
final class StatsViewModel {
    private(set) var summary: LearningSummary?
    private(set) var books: [Book] = []
    private(set) var stats: [Int: BookProgressStat] = [:]
    private(set) var vocab: [VocabEntry] = []
    private(set) var srs: SrsStore?

    var isLoading: Bool = false
    var error: String?

    let profileId: Int

    init(profileId: Int) {
        self.profileId = profileId
    }

    func load() async {
        isLoading = true
        defer { isLoading = false }
        error = nil

        do {
            // SRS 로컬 즉시 로드 + 서버 진도 머지 — 통계 화면이 다른 디바이스 평가까지 포함한 정확한 수치를 표시.
            let store = SrsStore(profileId: profileId)
            self.srs = store
            async let serverHydrate: Void = store.hydrateFromServer()

            async let summaryResp: LearningSummaryResponse = APIClient.shared.send(
                Endpoint(
                    path: "/api/learning-summary",
                    method: .get,
                    query: [URLQueryItem(name: "profileId", value: String(profileId))],
                ),
            )

            async let booksResp: BooksWithStatsResponse = APIClient.shared.send(
                Endpoint(
                    path: "/api/books",
                    method: .get,
                    query: [URLQueryItem(name: "profileId", value: String(profileId))],
                ),
            )

            async let vocabResp: VocabResponse = APIClient.shared.send(
                Endpoint(
                    path: "/api/vocab",
                    method: .get,
                    query: [URLQueryItem(name: "profileId", value: String(profileId))],
                ),
            )

            let (s, b, v) = try await (summaryResp, booksResp, vocabResp)
            await serverHydrate
            self.summary = s.summary
            self.books = b.books
            self.stats = Dictionary(
                uniqueKeysWithValues: (b.stats ?? [:]).compactMap { key, value in
                    guard let id = Int(key) else { return nil }
                    return (id, value)
                },
            )
            self.vocab = v.entries
        } catch {
            self.error = "통계를 불러오지 못했어요."
        }
    }

    // MARK: - Derived

    struct LevelRow: Identifiable {
        let level: CefrLevel
        let count: Int
        let finished: Int
        let avgAccuracy: Double?
        var id: String { level.rawValue }
    }

    /// 레벨별 책 수 + 완독 수 + 평균 정답률.
    func levelStats() -> [LevelRow] {
        var counts: [CefrLevel: Int] = [:]
        var finished: [CefrLevel: Int] = [:]
        var scores: [CefrLevel: [Double]] = [:]
        for b in books {
            counts[b.cefr, default: 0] += 1
            if let s = stats[b.id] {
                if s.finishedAtUnix != nil {
                    finished[b.cefr, default: 0] += 1
                }
                if let q = s.quizScore {
                    scores[b.cefr, default: []].append(Double(q) / 5.0)
                }
            }
        }
        return CefrLevel.allCases.map { lvl in
            let arr = scores[lvl] ?? []
            let avg = arr.isEmpty ? nil : arr.reduce(0, +) / Double(arr.count)
            return LevelRow(
                level: lvl,
                count: counts[lvl] ?? 0,
                finished: finished[lvl] ?? 0,
                avgAccuracy: avg,
            )
        }
    }

    /// 단어장 SRS 현황 — 누적/새 단어/모르는/학습 중.
    struct VocabBreakdown {
        let total: Int
        let fresh: Int
        let unknown: Int
        let mastering: Int
    }

    func vocabBreakdown() -> VocabBreakdown {
        guard let srs else {
            return VocabBreakdown(total: 0, fresh: 0, unknown: 0, mastering: 0)
        }
        var seen = Set<String>()
        var unique: [VocabEntry] = []
        for e in vocab {
            let key = e.word.lowercased()
            if seen.insert(key).inserted {
                unique.append(e)
            }
        }
        var fresh = 0
        var unknown = 0
        var mastering = 0
        for e in unique {
            guard let item = srs.item(for: e.word) else {
                fresh += 1
                continue
            }
            if item.level == 0 && item.lastGradedAtMs > 0 {
                unknown += 1
            } else {
                mastering += 1
            }
        }
        return VocabBreakdown(total: unique.count, fresh: fresh, unknown: unknown, mastering: mastering)
    }
}
