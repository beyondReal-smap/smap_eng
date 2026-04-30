package site.smap.harubook.core.models

import kotlinx.serialization.Serializable

/**
 * 책 생성 마법사 step 3에서 부모에게 던지는 한국어 인테이크 질문.
 * 백엔드 `/api/books/intake/questions` 응답 항목과 1:1 대응.
 */
@Serializable
data class IntakeQuestion(
    /** slug — `[a-z0-9][a-z0-9-]*` 1~40자. */
    val id: String,
    val text: String,
    val placeholder: String? = null,
    /** 선택지 칩 (최대 4). */
    val suggestionChips: List<String>? = null,
)

@Serializable
data class IntakeQuestionsResponse(
    val questions: List<IntakeQuestion>,
    val cached: Boolean = false,
)

/** `/api/books` POST의 intake 페이로드 — 빈 답변(skip)은 null로. */
@Serializable
data class IntakeAnswer(val questionId: String, val text: String?)

@Serializable
data class IntakePayload(
    val questions: List<QuestionRef>,
    val answers: List<IntakeAnswer>,
) {
    @Serializable
    data class QuestionRef(val id: String, val text: String)

    companion object {
        /**
         * 사용자 입력을 백엔드 페이로드로 변환. 공백만 입력된 경우 null로 정규화.
         */
        fun build(questions: List<IntakeQuestion>, answers: Map<String, String?>): IntakePayload {
            return IntakePayload(
                questions = questions.map { QuestionRef(id = it.id, text = it.text) },
                answers = questions.map { q ->
                    val raw = answers[q.id]?.trim()
                    IntakeAnswer(
                        questionId = q.id,
                        text = if (raw.isNullOrEmpty()) null else raw,
                    )
                },
            )
        }
    }
}
