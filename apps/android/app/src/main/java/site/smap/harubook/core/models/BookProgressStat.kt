package site.smap.harubook.core.models

import kotlinx.serialization.Serializable

@Serializable
data class BookProgressStat(
    val progressRatio: Double,
    val quizScore: Int? = null,
    val finishedAtUnix: Long? = null,
    val startedAtUnix: Long,
)

@Serializable
data class BooksWithStatsResponse(
    val books: List<Book>,
    val stats: Map<String, BookProgressStat>? = null,
)
