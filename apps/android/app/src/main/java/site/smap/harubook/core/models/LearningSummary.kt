package site.smap.harubook.core.models

import kotlinx.serialization.Serializable

@Serializable
data class LearningSummary(
    val totalBooksRead: Int,
    val totalFinishedSessions: Int,
    val totalPerfectScores: Int,
    /** 마스터한 단어 수 (vocab_progress.level >= 3). 구서버 응답에 없을 수 있어 기본값 0. */
    val masteredWords: Int = 0,
    val averageAccuracy: Double? = null,
    val lastFinishedAtUnix: Long? = null,
    val continueBookId: Int? = null,
    val activeDaysThisWeek: List<String> = emptyList(),
    val activeDaysThisMonth: List<String> = emptyList(),
    val thisMonth: String,
)

@Serializable
data class LearningSummaryResponse(val summary: LearningSummary)
