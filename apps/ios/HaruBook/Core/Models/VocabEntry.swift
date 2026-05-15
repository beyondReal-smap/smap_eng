import Foundation

/// `GET /api/vocab?profileId=…` 응답 항목.
/// 같은 단어가 여러 책에서 등장하면 중복 — 클라이언트에서 dedupe 권장.
struct VocabEntry: Decodable, Hashable, Sendable {
    let word: String
    let meaning: String
    let bookId: Int
    let bookTitle: String
}

struct VocabResponse: Decodable, Sendable {
    let entries: [VocabEntry]
}
