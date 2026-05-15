import Foundation

/// `GET /api/parents/report` 응답 항목.
/// 가족(user)의 프로필별 최근 7일 집계 + 신고된 책.
struct ParentalProfileReport: Decodable, Identifiable, Sendable {
    let profileId: Int
    let name: String
    let avatar: String?
    let booksCreatedWeek: Int
    let sessionsFinishedWeek: Int
    /// 0~1 또는 null.
    let averageAccuracyWeek: Double?
    let totalBooks: Int
    let totalPerfect: Int
    /// YYYY-MM-DD 정렬 배열.
    let activeDays: [String]
    let flaggedBooks: [FlaggedBookSummary]

    var id: Int { profileId }
}

struct FlaggedBookSummary: Decodable, Identifiable, Sendable, Hashable {
    let id: Int
    let title: String
    let reason: String?
    /// ISO8601 문자열.
    let flaggedAt: String
}

struct ParentalReportResponse: Decodable, Sendable {
    let report: [ParentalProfileReport]
}
