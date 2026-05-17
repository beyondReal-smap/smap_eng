package site.smap.harubook.features.createbook

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlinx.serialization.Serializable
import site.smap.harubook.core.models.Book
import site.smap.harubook.core.models.CefrLevel
import site.smap.harubook.core.models.IntakeQuestion
import site.smap.harubook.core.models.IntakeQuestionsResponse
import site.smap.harubook.core.networking.ApiClient

/**
 * iOS `CreateBookViewModel.swift` 미러. 4단계 마법사의 단일 상태/흐름.
 *
 * 백엔드 호출
 *  - POST /api/books/intake/questions  → 2~3 질문
 *  - POST /api/books                   → 책 + passages (intake 명시 null 필요)
 *  - POST /api/image/book/{id}/cover   → 표지(백그라운드, 멱등, 실패 무시)
 */
class CreateBookViewModel(
    private val profileId: Int,
    private val ageHint: Int,
) : ViewModel() {

    enum class Genre(val raw: String, val label: String, val description: String) {
        Fiction("fiction", "이야기 (Fiction)", "상상 속 인물과 모험"),
        NonFiction("non_fiction", "정보 (Non-fiction)", "실제 사실과 지식"),
    }

    enum class Step { Genre, Level, Intake, Generating }

    data class UiState(
        val step: Step = Step.Genre,
        val genre: Genre? = null,
        val cefr: CefrLevel? = null,
        val intakeQuestions: List<IntakeQuestion> = emptyList(),
        val intakeAnswers: Map<String, String> = emptyMap(),
        val isLoadingIntake: Boolean = false,
        val intakeError: String? = null,
        val isGenerating: Boolean = false,
        val generationError: String? = null,
        val createdBook: Book? = null,
    )

    private val _state = MutableStateFlow(UiState())
    val state: StateFlow<UiState> = _state.asStateFlow()

    fun selectGenre(value: Genre) {
        _state.update { it.copy(genre = value, step = Step.Level) }
    }

    fun selectLevel(value: CefrLevel) {
        _state.update { it.copy(cefr = value, step = Step.Intake) }
        loadIntake()
    }

    fun goBack() {
        _state.update {
            val next = when (it.step) {
                Step.Genre -> Step.Genre
                Step.Level -> Step.Genre
                Step.Intake -> Step.Level
                Step.Generating -> Step.Generating
            }
            it.copy(step = next)
        }
    }

    fun updateAnswer(id: String, text: String) {
        _state.update { it.copy(intakeAnswers = it.intakeAnswers + (id to text)) }
    }

    fun selectChip(id: String, value: String) {
        updateAnswer(id, value)
    }

    private fun loadIntake() {
        val genre = _state.value.genre ?: return
        val cefr = _state.value.cefr ?: return
        viewModelScope.launch {
            _state.update { it.copy(isLoadingIntake = true, intakeError = null) }
            try {
                val response: IntakeQuestionsResponse = ApiClient.post(
                    path = "/api/books/intake/questions",
                    body = IntakeRequest(profileId = profileId, genre = genre.raw, cefr = cefr.name),
                )
                _state.update {
                    it.copy(intakeQuestions = response.questions, isLoadingIntake = false)
                }
            } catch (e: Throwable) {
                _state.update {
                    it.copy(
                        isLoadingIntake = false,
                        intakeError = "질문을 불러오지 못했어요: ${e.message ?: e::class.java.simpleName}",
                    )
                }
            }
        }
    }

    fun generate() {
        val st = _state.value
        val genre = st.genre ?: return
        val cefr = st.cefr ?: return
        if (st.isGenerating) return

        _state.update { it.copy(step = Step.Generating, isGenerating = true, generationError = null) }

        viewModelScope.launch {
            val payload = CreateBookRequest(
                profileId = profileId,
                level = LevelPayload(age = ageHint, cefr = cefr.name),
                genre = genre.raw,
                intake = if (st.intakeQuestions.isEmpty()) null else IntakePayload(
                    questions = st.intakeQuestions.map { QuestionRef(id = it.id, text = it.text) },
                    answers = st.intakeQuestions.map { q ->
                        val raw = st.intakeAnswers[q.id]?.trim()
                        IntakeAnswer(questionId = q.id, text = raw?.takeIf { it.isNotEmpty() })
                    },
                ),
            )
            try {
                val response: CreateBookResponse = ApiClient.postExplicitNulls(
                    path = "/api/books",
                    body = payload,
                    bodySerializer = CreateBookRequest.serializer(),
                    timeoutMillis = 180_000,
                )
                _state.update { it.copy(isGenerating = false, createdBook = response.book) }

                // 표지 백그라운드 트리거 — 실패 무시.
                runCatching {
                    ApiClient.post<CoverResponse>(path = "/api/image/book/${response.book.id}/cover")
                }
            } catch (e: Throwable) {
                _state.update {
                    it.copy(
                        isGenerating = false,
                        generationError = "동화 생성에 실패했어요: ${e.message ?: e::class.java.simpleName}",
                    )
                }
            }
        }
    }
}

// MARK: - Wire payloads

@Serializable
internal data class IntakeRequest(val profileId: Int, val genre: String, val cefr: String)

@Serializable
internal data class LevelPayload(val age: Int, val cefr: String)

@Serializable
internal data class QuestionRef(val id: String, val text: String)

/**
 * IntakeAnswer.text 가 null 일 때 백엔드 zod는 명시 `null` 키를 요구한다.
 * [ApiClient.postExplicitNulls] 로 직렬화해야 한다.
 */
@Serializable
internal data class IntakeAnswer(val questionId: String, val text: String?)

@Serializable
internal data class IntakePayload(
    val questions: List<QuestionRef>,
    val answers: List<IntakeAnswer>,
)

@Serializable
internal data class CreateBookRequest(
    val profileId: Int,
    val level: LevelPayload,
    val genre: String,
    val intake: IntakePayload?,
)

@Serializable
internal data class CreateBookResponse(val book: Book)

@Serializable
internal class CoverResponse
