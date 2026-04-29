import Foundation
import Observation

@Observable
@MainActor
final class BookshelfViewModel {
    let profileId: Int
    var books: [Book] = []
    var ageFilter: Int?
    var cefrFilter: CefrLevel?
    var isLoading: Bool = false
    var error: String?

    init(profileId: Int) {
        self.profileId = profileId
    }

    func load() async {
        isLoading = true
        defer { isLoading = false }

        var query: [URLQueryItem] = [
            URLQueryItem(name: "profileId", value: String(profileId))
        ]
        if let age = ageFilter {
            query.append(URLQueryItem(name: "age", value: String(age)))
        }
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

    func setAge(_ age: Int?) async {
        ageFilter = age
        await load()
    }

    func setCefr(_ cefr: CefrLevel?) async {
        cefrFilter = cefr
        await load()
    }
}
