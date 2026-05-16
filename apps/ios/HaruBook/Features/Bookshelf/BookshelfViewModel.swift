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
}
