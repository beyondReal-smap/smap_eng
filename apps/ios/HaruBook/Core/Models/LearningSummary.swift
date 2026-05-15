import Foundation

/// `GET /api/learning-summary?profileId=…` 응답의 `summary` 필드.
/// 웹 `LearningSummary` 인터페이스와 1:1 미러.
struct LearningSummary: Decodable, Sendable {
    let totalBooksRead: Int
    let totalFinishedSessions: Int
    let totalPerfectScores: Int
    /// 0~1 또는 null. null이면 평가된 퀴즈가 없음.
    let averageAccuracy: Double?
    /// epoch seconds 또는 null.
    let lastFinishedAtUnix: Int?
    /// 마지막으로 진행 중이던 책 — "이어 읽기" 표시용. null이면 없음.
    let continueBookId: Int?
    /// YYYY-MM-DD 정렬된 배열.
    let activeDaysThisWeek: [String]
    let activeDaysThisMonth: [String]
    /// 현재 월 (YYYY-MM).
    let thisMonth: String
}

struct LearningSummaryResponse: Decodable, Sendable {
    let summary: LearningSummary
}
