package site.smap.harubook.core.models

import kotlinx.serialization.Serializable

@Serializable
data class ReadingLog(
    val id: Int,
    val profileId: Int,
    val bookId: Int,
    val progressRatio: Double? = null,
    val startedAtUnix: Long? = null,
    val finishedAtUnix: Long? = null,
    val quizScore: Int? = null,
)

@Serializable
data class ReadingLogResponse(val log: ReadingLog)
