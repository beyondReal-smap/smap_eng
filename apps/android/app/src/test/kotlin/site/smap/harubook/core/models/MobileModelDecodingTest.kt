package site.smap.harubook.core.models

import kotlinx.serialization.json.Json
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class MobileModelDecodingTest {
    private val json = Json { ignoreUnknownKeys = true }

    @Test
    fun decodesLearningSummaryResponse() {
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
        assertEquals(4, decoded.summary.totalFinishedSessions)
        assertEquals(2, decoded.summary.totalPerfectScores)
        assertEquals(0.8, decoded.summary.averageAccuracy!!, 0.0001)
        assertEquals(1710000000L, decoded.summary.lastFinishedAtUnix)
        assertEquals(11, decoded.summary.continueBookId)
        assertEquals(listOf("2026-05-11"), decoded.summary.activeDaysThisWeek)
        assertEquals(listOf("2026-05-01", "2026-05-11"), decoded.summary.activeDaysThisMonth)
        assertEquals("2026-05", decoded.summary.thisMonth)
    }

    @Test
    fun decodesNullableSummaryFields() {
        val payload = """
            {
              "summary": {
                "totalBooksRead": 0,
                "totalFinishedSessions": 0,
                "totalPerfectScores": 0,
                "averageAccuracy": null,
                "lastFinishedAtUnix": null,
                "continueBookId": null,
                "activeDaysThisWeek": [],
                "activeDaysThisMonth": [],
                "thisMonth": "2026-05"
              }
            }
        """.trimIndent()

        val decoded = json.decodeFromString<LearningSummaryResponse>(payload)

        assertNull(decoded.summary.averageAccuracy)
        assertNull(decoded.summary.lastFinishedAtUnix)
        assertNull(decoded.summary.continueBookId)
    }

    @Test
    fun decodesBooksWithStatsResponse() {
        val payload = """
            {
              "books": [
                {
                  "id": 9,
                  "profileId": 1,
                  "title": "Moon Cake",
                  "age": 7,
                  "cefr": "A1",
                  "topic": "space",
                  "coverImagePath": null,
                  "flaggedAt": null,
                  "createdAt": 1710000100
                }
              ],
              "stats": {
                "9": {
                  "progressRatio": 1.0,
                  "quizScore": 5,
                  "finishedAtUnix": 1710000200,
                  "startedAtUnix": 1710000100
                }
              }
            }
        """.trimIndent()

        val decoded = json.decodeFromString<BooksWithStatsResponse>(payload)

        assertEquals("Moon Cake", decoded.books.first().title)
        assertEquals(1.0, decoded.stats!!.getValue("9").progressRatio, 0.0001)
        assertEquals(5, decoded.stats!!.getValue("9").quizScore)
        assertEquals(1710000200L, decoded.stats!!.getValue("9").finishedAtUnix)
    }

    @Test
    fun decodesVocabResponse() {
        val payload = """
            {
              "entries": [
                {
                  "word": "brave",
                  "meaning": "용감한",
                  "bookId": 9,
                  "bookTitle": "Moon Cake"
                }
              ]
            }
        """.trimIndent()

        val decoded = json.decodeFromString<VocabResponse>(payload)

        assertEquals("brave", decoded.entries.first().word)
        assertEquals("용감한", decoded.entries.first().meaning)
        assertEquals(9, decoded.entries.first().bookId)
        assertEquals("Moon Cake", decoded.entries.first().bookTitle)
    }
}
