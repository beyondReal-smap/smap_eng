package site.smap.harubook.features.stats

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import site.smap.harubook.core.models.Book
import site.smap.harubook.core.models.BookProgressStat
import site.smap.harubook.core.models.CefrLevel
import site.smap.harubook.core.models.VocabEntry

class StatsMetricsTest {
    @Test
    fun levelStatsCountsFinishedAndAverageAccuracy() {
        val books = listOf(
            book(id = 1, cefr = CefrLevel.A1),
            book(id = 2, cefr = CefrLevel.A1),
            book(id = 3, cefr = CefrLevel.A2),
        )
        val stats = mapOf(
            1 to BookProgressStat(progressRatio = 1.0, quizScore = 5, finishedAtUnix = 10, startedAtUnix = 1),
            2 to BookProgressStat(progressRatio = 0.5, quizScore = 3, finishedAtUnix = null, startedAtUnix = 2),
            3 to BookProgressStat(progressRatio = 1.0, quizScore = null, finishedAtUnix = 12, startedAtUnix = 3),
        )

        val rows = levelStats(books, stats)
        val a1 = rows.first { it.level == CefrLevel.A1 }
        val a2 = rows.first { it.level == CefrLevel.A2 }
        val b1 = rows.first { it.level == CefrLevel.B1 }
        assertEquals(2, a1.count)
        assertEquals(1, a1.finished)
        assertEquals(0.8, a1.averageAccuracy!!, 0.0001)
        assertEquals(1, a2.count)
        assertEquals(null, a2.averageAccuracy)
        assertEquals(0, b1.count)
    }

    @Test
    fun vocabBreakdownDedupesCaseInsensitively() {
        val entries = listOf(
            vocab("Brave", "용감한"),
            vocab("brave", "용감한"),
            vocab("Moon", "달"),
            vocab("kind", "친절한"),
        )

        val breakdown = vocabBreakdown(
            entries = entries,
            unknownWords = setOf("moon"),
            masteringWords = setOf("kind"),
        )
        assertEquals(3, breakdown.total)
        assertEquals(1, breakdown.fresh)
        assertEquals(1, breakdown.unknown)
        assertEquals(1, breakdown.mastering)
    }

    @Test
    fun monthGridForMay2026() {
        val grid = buildMonthGrid("2026-05", setOf("2026-05-01", "2026-05-16"))
        assertEquals(36, grid.size)
        assertEquals(null, grid[0].day)
        assertEquals(null, grid[4].day)
        assertEquals(1, grid[5].day)
        assertTrue(grid[5].active)
        assertEquals(16, grid[20].day)
        assertTrue(grid[20].active)
        assertEquals(31, grid.last().day)
        assertFalse(grid.last().active)
    }

    private fun book(id: Int, cefr: CefrLevel): Book =
        Book(id = id, profileId = 1, title = "Book $id", age = 7, cefr = cefr)

    private fun vocab(word: String, meaning: String): VocabEntry =
        VocabEntry(word = word, meaning = meaning, bookId = 1, bookTitle = "Book")
}
