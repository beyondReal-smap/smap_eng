package site.smap.harubook.core.models

import kotlinx.serialization.Serializable

@Serializable
data class LearningSummary(
    val totalBooksRead: Int,
    val totalFinishedSessions: Int,
    val totalPerfectScores: Int,
    val averageAccuracy: Double? = null,
    val lastFinishedAtUnix: Long? = null,
    val continueBookId: Int? = null,
    val activeDaysThisWeek: List<String> = emptyList(),
    val activeDaysThisMonth: List<String> = emptyList(),
    val thisMonth: String,
)

@Serializable
data class LearningSummaryResponse(val summary: LearningSummary)
