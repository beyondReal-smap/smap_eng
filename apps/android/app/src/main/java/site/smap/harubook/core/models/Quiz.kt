package site.smap.harubook.core.models

import kotlinx.serialization.Serializable

@Serializable
data class Quiz(
    val id: Int,
    val bookId: Int,
    val orderIndex: Int,
    val question: String,
    val choices: List<String>,
    val answerIndex: Int,
    val explanation: String? = null,
)

@Serializable
data class QuizzesResponse(
    val quizzes: List<Quiz>,
    val created: Boolean? = null,
)
