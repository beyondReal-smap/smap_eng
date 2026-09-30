import Foundation
import Observation

@Observable
@MainActor
final class BookshelfViewModel {
    let profileId: Int
    var books: [Book] = []
    var cefrFilter: CefrLevel?
    var isLoading: Bool = false
    var error: String?
    var credits: CreditBalance?
    /// `GET /api/learning-summary` — 이어 읽기 대상. 실패 시 nil(카드 숨김).
    var summary: LearningSummary?

    /// continueBookId가 있고 현재 목록에 그 책이 있을 때만 카드 노출(fail-soft).
    var continueBook: Book? {
        guard let id = summary?.continueBookId else { return nil }
        return books.first(where: { $0.id == id })
    }

    init(profileId: Int) {
        self.profileId = profileId
    }

    func fetchCredits() async {
        do {
            let response: CreditsResponse = try await APIClient.shared.send(
                Endpoint(path: "/api/billing/credits", method: .get)
            )
            self.credits = response.credits
        } catch {
            // 소프트 페일 — 별 잔액은 보조 정보.
        }
    }

    func load() async {
        isLoading = true
        defer { isLoading = false }

        var query: [URLQueryItem] = [
            URLQueryItem(name: "profileId", value: String(profileId))
        ]
        if let cefr = cefrFilter {
            query.append(URLQueryItem(name: "cefr", value: cefr.rawValue))
        }

        do {
            let response: BooksResponse = try await APIClient.shared.send(
                Endpoint(path: "/api/books", method: .get, query: query)
            )
            self.books = response.books
            self.error = nil
        } catch {
            self.error = error.localizedDescription
        }
    }

    func setCefr(_ cefr: CefrLevel?) async {
        cefrFilter = cefr
        await load()
    }

    /// 이어 읽기용 요약. 실패해도 책장 본체는 유지 — 카드만 숨긴다.
    func fetchSummary() async {
        do {
            let response: LearningSummaryResponse = try await APIClient.shared.send(
                Endpoint(
                    path: "/api/learning-summary",
                    method: .get,
                    query: [URLQueryItem(name: "profileId", value: String(profileId))],
                )
            )
            self.summary = response.summary
        } catch {
            self.summary = nil
        }
    }
}
