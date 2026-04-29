package site.smap.harubook.core.models

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

/**
 * 백엔드는 `startedAtUnix` / `finishedAtUnix` (unix seconds) 키를 사용한다.
 */
@Serializable
data class ReadingLog(
    val id: Int,
    val profileId: Int,
    val bookId: Int,
    val progressRatio: Double? = null,
    @SerialName("startedAtUnix")
    val startedAtUnix: Long? = null,
    @SerialName("finishedAtUnix")
    val finishedAtUnix: Long? = null,
    val quizScore: Int? = null,
)

@Serializable
data class ReadingLogResponse(val log: ReadingLog)

@Serializable
data class StartLogRequest(val profileId: Int, val bookId: Int)

@Serializable
data class PatchLogRequest(
    val id: Int,
    val progressRatio: Double? = null,
    val finishedAtUnix: Long? = null,
    val quizScore: Int? = null,
)
