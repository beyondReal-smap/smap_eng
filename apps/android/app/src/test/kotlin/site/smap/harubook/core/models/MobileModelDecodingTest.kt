package site.smap.harubook.core.models

import kotlinx.serialization.json.Json
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * 도메인 모델 직렬화 회귀 가드. 백엔드 응답 스키마와 1:1 동기화를 검증한다.
 */
class MobileModelDecodingTest {
    private val json = Json {
        ignoreUnknownKeys = true
        coerceInputValues = true
        explicitNulls = false
    }

    @Test
    fun decodesLearningSummary() {
        val payload = """
            {
              "summary": {
                "totalBooksRead": 3,
                "totalFinishedSessions": 4,
                "totalPerfectScores": 2,
                "averageAccuracy": 0.8,
                "lastFinishedAtUnix": 1710000000,
                "continueBookId": 11,
                "activeDaysThisWeek": ["2026-05-11"],
                "activeDaysThisMonth": ["2026-05-01", "2026-05-11"],
                "thisMonth": "2026-05"
              }
            }
        """.trimIndent()

        val decoded = json.decodeFromString<LearningSummaryResponse>(payload)
        assertEquals(3, decoded.summary.totalBooksRead)
        assertEquals(0.8, decoded.summary.averageAccuracy!!, 0.0001)
        assertEquals(listOf("2026-05-01", "2026-05-11"), decoded.summary.activeDaysThisMonth)
    }

    @Test
    fun decodesBooksWithStats() {
        val payload = """
            {
              "books": [
                {"id":1,"profileId":7,"title":"Moon","age":7,"cefr":"A1"}
              ],
              "stats": {
                "1": {"progressRatio":1.0,"quizScore":5,"finishedAtUnix":1710000000,"startedAtUnix":1709990000}
              }
            }
        """.trimIndent()

        val decoded = json.decodeFromString<BooksWithStatsResponse>(payload)
        assertEquals(1, decoded.books.size)
        val stat = decoded.stats!!["1"]!!
        assertEquals(1.0, stat.progressRatio, 0.0001)
        assertEquals(5, stat.quizScore)
    }

    @Test
    fun decodesVocabEntries() {
        val payload = """
            {"entries":[{"word":"moon","meaning":"달","bookId":1,"bookTitle":"Moon"}]}
        """.trimIndent()
        val decoded = json.decodeFromString<VocabResponse>(payload)
        assertEquals(1, decoded.entries.size)
        assertEquals("moon", decoded.entries.first().word)
    }

    @Test
    fun decodesProfileWithDefaults() {
        val payload = """{"id":42,"name":"지우"}"""
        val decoded = json.decodeFromString<Profile>(payload)
        assertEquals(42, decoded.id)
        assertEquals("지우", decoded.name)
        assertEquals(7, decoded.age)
        assertNull(decoded.avatar)
    }

    @Test
    fun decodesParentalReport() {
        val payload = """
            {"report":[
              {"profileId":1,"name":"지우","booksCreatedWeek":2,"sessionsFinishedWeek":3,
               "averageAccuracyWeek":0.6,"totalBooks":10,"totalPerfect":2,
               "activeDays":["2026-05-10"],
               "flaggedBooks":[{"id":99,"title":"Bad","reason":"오타","flaggedAt":"2026-05-11T00:00:00Z"}]}
            ]}
        """.trimIndent()
        val decoded = json.decodeFromString<ParentalReportResponse>(payload)
        assertEquals(1, decoded.report.size)
        val r = decoded.report.first()
        assertEquals("지우", r.name)
        assertEquals(1, r.flaggedBooks.size)
        assertEquals(99, r.flaggedBooks.first().id)
    }

    @Test
    fun decodesBookWithVocabularyOmitted() {
        val payload = """{"id":1,"profileId":2,"title":"T","age":7,"cefr":"A1"}"""
        val decoded = json.decodeFromString<Book>(payload)
        assertNull(decoded.vocabulary)
        assertEquals(CefrLevel.A1, decoded.cefr)
        assertTrue(!decoded.isFlagged)
    }

    @Test
    fun cefrRecommendationByAge() {
        assertEquals(listOf(CefrLevel.A1), CefrLevel.recommended(5))
        assertEquals(listOf(CefrLevel.A1, CefrLevel.A2), CefrLevel.recommended(7))
        assertEquals(listOf(CefrLevel.A2, CefrLevel.B1), CefrLevel.recommended(10))
    }

    @Test
    fun decodesReadingLogUnixFields() {
        val payload = """
            {"id":1,"profileId":2,"bookId":3,"progressRatio":0.5,
             "startedAtUnix":1710000000,"finishedAtUnix":null,"quizScore":null}
        """.trimIndent()
        val decoded = json.decodeFromString<ReadingLog>(payload)
        assertEquals(1710000000L, decoded.startedAtUnix)
        assertNull(decoded.finishedAtUnix)
        assertEquals(0.5, decoded.progressRatio!!, 0.0001)
    }
}
