import Foundation

struct ReadingLog: Codable, Identifiable, Hashable, Sendable {
    let id: Int
    let profileId: Int
    let bookId: Int
    let progressRatio: Double?
    let startedAt: Date?
    let finishedAt: Date?
    let quizScore: Int?

    enum CodingKeys: String, CodingKey {
        case id
        case profileId
        case bookId
        case progressRatio
        case quizScore
        // 백엔드는 unix sec 키를 사용한다.
        case startedAt = "startedAtUnix"
        case finishedAt = "finishedAtUnix"
    }

    init(from decoder: any Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        self.id = try c.decode(Int.self, forKey: .id)
        self.profileId = try c.decode(Int.self, forKey: .profileId)
        self.bookId = try c.decode(Int.self, forKey: .bookId)
        self.progressRatio = try c.decodeIfPresent(Double.self, forKey: .progressRatio)
        self.quizScore = try c.decodeIfPresent(Int.self, forKey: .quizScore)
        self.startedAt = Self.decodeUnix(c, key: .startedAt)
        self.finishedAt = Self.decodeUnix(c, key: .finishedAt)
    }

    private static func decodeUnix(_ c: KeyedDecodingContainer<CodingKeys>, key: CodingKeys) -> Date? {
        guard let value = try? c.decodeIfPresent(Double.self, forKey: key) else { return nil }
        let seconds = value > 1_000_000_000_000 ? value / 1000 : value
        return Date(timeIntervalSince1970: seconds)
    }
}

struct ReadingLogResponse: Decodable {
    let log: ReadingLog
}
