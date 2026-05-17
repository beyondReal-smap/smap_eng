package site.smap.harubook.features.stats

import java.time.YearMonth
import site.smap.harubook.core.models.Book
import site.smap.harubook.core.models.BookProgressStat
import site.smap.harubook.core.models.CefrLevel
import site.smap.harubook.core.models.VocabEntry

/**
 * 통계 화면용 pure 함수 모음. Android runtime 의존성 없음 → JVM 유닛 테스트 가능.
 */

data class LevelStatRow(
    val level: CefrLevel,
    val count: Int,
    val finished: Int,
    val averageAccuracy: Double?,
)

data class VocabBreakdown(
    val total: Int,
    val fresh: Int,
    val unknown: Int,
    val mastering: Int,
)

data class MonthGridCell(
    val day: Int?,
    val active: Boolean,
)

fun levelStats(
    books: List<Book>,
    stats: Map<Int, BookProgressStat>,
): List<LevelStatRow> =
    CefrLevel.entries.map { level ->
        val levelBooks = books.filter { it.cefr == level }
        val levelStats = levelBooks.mapNotNull { stats[it.id] }
        val scores = levelStats.mapNotNull { it.quizScore?.let { score -> score.toDouble() / 5.0 } }
        LevelStatRow(
            level = level,
            count = levelBooks.size,
            finished = levelStats.count { it.finishedAtUnix != null },
            averageAccuracy = scores.takeIf { it.isNotEmpty() }?.average(),
        )
    }

fun vocabBreakdown(
    entries: List<VocabEntry>,
    unknownWords: Set<String> = emptySet(),
    masteringWords: Set<String> = emptySet(),
): VocabBreakdown {
    val uniqueWords = entries
        .map { it.word.trim().lowercase() }
        .filter { it.isNotEmpty() }
        .distinct()

    val unknown = uniqueWords.count { it in unknownWords }
    val mastering = uniqueWords.count { it in masteringWords }
    return VocabBreakdown(
        total = uniqueWords.size,
        fresh = uniqueWords.size - unknown - mastering,
        unknown = unknown,
        mastering = mastering,
    )
}

fun buildMonthGrid(thisMonth: String, activeDays: Set<String>): List<MonthGridCell> {
    val month = YearMonth.parse(thisMonth)
    val leadingBlanks = month.atDay(1).dayOfWeek.value % 7
    val cells = mutableListOf<MonthGridCell>()
    repeat(leadingBlanks) { cells += MonthGridCell(day = null, active = false) }
    for (day in 1..month.lengthOfMonth()) {
        val key = "%04d-%02d-%02d".format(month.year, month.monthValue, day)
        cells += MonthGridCell(day = day, active = key in activeDays)
    }
    return cells
}
