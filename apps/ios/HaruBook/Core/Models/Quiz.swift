import Foundation

/// 백엔드 `quizzes` 테이블 row 형식.
struct Quiz: Codable, Identifiable, Hashable, Sendable {
    let id: Int
    let bookId: Int
    let orderIndex: Int
    let question: String
    let choices: [String]
    let answerIndex: Int
    let explanation: String?
}

struct QuizzesResponse: Decodable {
    let quizzes: [Quiz]
    let created: Bool?
}
