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

/// 책 본문에서 학습자가 알아두면 좋은 핵심 단어. LLM이 생성 시 함께 채운다.
/// Reader에서 본문 텍스트를 토큰화해 매칭되는 단어를 클릭 가능한 popover로 감싼다.
struct VocabularyEntry: Codable, Hashable, Sendable {
    let word: String
    let meaning: String
}

struct Book: Codable, Identifiable, Hashable, Sendable {
    let id: Int
    let profileId: Int
    let title: String
    let age: Int
    let cefr: CefrLevel
    let topic: String?
    let coverImagePath: String?
    /// nil/빈 배열이면 Reader는 모든 단어를 plain text로 렌더링.
    let vocabulary: [VocabularyEntry]?
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
