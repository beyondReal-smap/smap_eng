package site.smap.harubook.core.models

import kotlinx.serialization.Serializable

/**
 * 책 생성 마법사 step 3 인테이크 질문. iOS `IntakeQuestion.swift` 미러.
 *
 * IntakeAnswer / IntakePayload(서버 zod가 명시 null 요구)는 CreateBook 마법사 구현 시
 * 별도 Json 설정(`explicitNulls = true`)과 함께 추가한다. — Phase 3 범위.
 */
@Serializable
data class IntakeQuestion(
    val id: String,
    val text: String,
    val placeholder: String? = null,
    val suggestionChips: List<String>? = null,
)

@Serializable
data class IntakeQuestionsResponse(
    val questions: List<IntakeQuestion>,
    val cached: Boolean,
)
