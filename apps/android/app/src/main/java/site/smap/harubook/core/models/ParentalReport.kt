package site.smap.harubook.core.models

import kotlinx.serialization.Serializable

@Serializable
data class ParentalProfileReport(
    val profileId: Int,
    val name: String,
    val avatar: String? = null,
    val booksCreatedWeek: Int,
    val sessionsFinishedWeek: Int,
    val averageAccuracyWeek: Double? = null,
    val totalBooks: Int,
    val totalPerfect: Int,
    val activeDays: List<String> = emptyList(),
    val flaggedBooks: List<FlaggedBookSummary> = emptyList(),
)

@Serializable
data class FlaggedBookSummary(
    val id: Int,
    val title: String,
    val reason: String? = null,
    /** ISO8601 문자열. */
    val flaggedAt: String,
)

@Serializable
data class ParentalReportResponse(val report: List<ParentalProfileReport>)
