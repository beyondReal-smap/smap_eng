import Foundation

/// `/api/books?profileId=…` 응답의 `stats` 맵 값.
/// 책별 최신 reading_log 스냅샷.
struct BookProgressStat: Decodable, Sendable {
    /// 0.0 ~ 1.0
    let progressRatio: Double
    /// 0 ~ 5 또는 null.
    let quizScore: Int?
    /// epoch seconds 또는 null (아직 완료 전).
    let finishedAtUnix: Int?
    /// epoch seconds.
    let startedAtUnix: Int
}

/// `/api/books` 응답에 stats를 포함하는 확장 디코딩.
/// 기존 `BooksResponse`는 stats를 무시하므로 통계 화면 전용 디코더를 별도로 둔다.
struct BooksWithStatsResponse: Decodable, Sendable {
    let books: [Book]
    /// 키는 JSON 상에서 String이지만 의미상 book id. ViewModel에서 Int로 변환.
    let stats: [String: BookProgressStat]?
}
