import Foundation

struct Profile: Codable, Identifiable, Hashable, Sendable {
    let id: Int
    let name: String
    let avatar: String?
    let createdAt: Date?

    init(id: Int, name: String, avatar: String? = nil, createdAt: Date? = nil) {
        self.id = id
        self.name = name
        self.avatar = avatar
        self.createdAt = createdAt
    }

    init(from decoder: any Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        self.id = try c.decode(Int.self, forKey: .id)
        self.name = try c.decode(String.self, forKey: .name)
        self.avatar = try c.decodeIfPresent(String.self, forKey: .avatar)
        // 백엔드 createdAt은 unix sec 또는 ISO 또는 누락 가능. 누락 시 nil.
        if let unix = try? c.decodeIfPresent(Double.self, forKey: .createdAt) {
            self.createdAt = Date(timeIntervalSince1970: unix > 1_000_000_000_000 ? unix / 1000 : unix)
        } else if let iso = try? c.decodeIfPresent(String.self, forKey: .createdAt) {
            let formatter = ISO8601DateFormatter()
            formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
            self.createdAt = formatter.date(from: iso) ?? ISO8601DateFormatter().date(from: iso)
        } else {
            self.createdAt = nil
        }
    }
}
