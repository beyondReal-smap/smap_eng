import Foundation

/// 책의 CEFR 난이도. 백엔드와 동일 A1~B2 4종. UI 필터/배지에 모두 노출.
enum CefrLevel: String, Codable, CaseIterable, Hashable, Sendable, Identifiable {
    case a1 = "A1"
    case a2 = "A2"
    case b1 = "B1"
    case b2 = "B2"

    var id: String { rawValue }
    var label: String { rawValue }

    static func recommended(forAge age: Int) -> [CefrLevel] {
        switch age {
        case ..<7: return [.a1]
        case 7...8: return [.a1, .a2]
        default: return [.a2, .b1]
        }
    }
}

struct Book: Codable, Identifiable, Hashable, Sendable {
    let id: Int
    let profileId: Int
    let title: String
    let age: Int
    let cefr: CefrLevel
    let topic: String?
    let coverImagePath: String?
    let flaggedAt: Date?
    let createdAt: Date?

    var isFlagged: Bool { flaggedAt != nil }
}

/// `GET /api/books?profileId=…` 응답. `stats`는 책별 진도 스냅샷(향후 사용 예정).
struct BooksResponse: Decodable {
    let books: [Book]
}

/// `GET /api/books/[id]` 응답.
struct BookDetail: Decodable {
    let book: Book
    let passages: [Passage]
}
