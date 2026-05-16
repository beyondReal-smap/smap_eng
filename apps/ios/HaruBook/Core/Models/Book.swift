import Foundation

/// 책의 CEFR 난이도. 백엔드는 'A1' | 'A2' | 'B1' | 'B2' 4종을 보낼 수 있다 —
/// iOS UI 필터(`allCases`)에서는 A1/A2/B1만 노출하고, B2는 디코딩 호환만 유지.
enum CefrLevel: String, Codable, CaseIterable, Hashable, Sendable, Identifiable {
    case a1 = "A1"
    case a2 = "A2"
    case b1 = "B1"
    case b2 = "B2"

    var id: String { rawValue }
    var label: String { rawValue }

    /// UI 필터/배지에 노출되는 레벨. B2는 향후 도입 예정이라 디코딩 호환만 유지하고
    /// 명시적으로 allCases 에서 제외 (자동 합성 override).
    static var allCases: [CefrLevel] { [.a1, .a2, .b1] }

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
