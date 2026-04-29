import Foundation

struct Passage: Codable, Identifiable, Hashable, Sendable {
    let id: Int
    let bookId: Int
    let orderIndex: Int
    let textEn: String
    let textKo: String?
    let audioPath: String?
    let sceneImagePath: String?
}
