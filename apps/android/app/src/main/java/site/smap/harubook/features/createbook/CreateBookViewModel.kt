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
import site.smap.harubook.core.models.IntakePayload
import site.smap.harubook.core.models.IntakeQuestion
import site.smap.harubook.core.models.IntakeQuestionsResponse
import site.smap.harubook.core.networking.ApiClient

enum class Genre(val wire: String, val label: String, val description: String) {
    Fiction("fiction", "이야기 (Fiction)", "상상 속 인물과 모험"),
    NonFiction("non_fiction", "정보 (Non-fiction)", "실제 사실과 지식");
}

enum class CreateStep { Genre, Level, Intake, Generating }

data class CreateBookUiState(
    val step: CreateStep = CreateStep.Genre,
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

class CreateBookViewModel(val profileId: Int) : ViewModel() {

    private val _state = MutableStateFlow(CreateBookUiState())
    val state: StateFlow<CreateBookUiState> = _state.asStateFlow()

    fun selectGenre(g: Genre) {
        _state.update { it.copy(genre = g, step = CreateStep.Level) }
    }

    fun selectLevel(c: CefrLevel) {
        _state.update { it.copy(cefr = c, step = CreateStep.Intake) }
        loadIntake()
    }

    fun goBack() {
        _state.update {
            when (it.step) {
                CreateStep.Genre -> it
                CreateStep.Level -> it.copy(step = CreateStep.Genre)
                CreateStep.Intake -> it.copy(step = CreateStep.Level)
                CreateStep.Generating -> it
            }
        }
    }

    fun loadIntake() {
        val s = _state.value
        val genre = s.genre ?: return
        val cefr = s.cefr ?: return
        viewModelScope.launch {
            _state.update { it.copy(isLoadingIntake = true, intakeError = null) }
            try {
                val response: IntakeQuestionsResponse = ApiClient.post(
                    path = "/api/books/intake/questions",
                    body = IntakeRequest(profileId = profileId, genre = genre.wire, cefr = cefr.name),
                )
                _state.update {
                    it.copy(
                        intakeQuestions = response.questions,
                        isLoadingIntake = false,
                        intakeError = null,
                    )
                }
            } catch (e: Throwable) {
                _state.update {
                    it.copy(
                        isLoadingIntake = false,
                        intakeError = "질문을 불러오지 못했어요: ${e.message}",
                    )
                }
            }
        }
    }

    fun updateAnswer(id: String, text: String) {
        _state.update { it.copy(intakeAnswers = it.intakeAnswers + (id to text)) }
    }

    fun selectChip(id: String, value: String) {
        updateAnswer(id, value)
    }

    fun generate() {
        val s = _state.value
        val genre = s.genre ?: return
        val cefr = s.cefr ?: return
        if (s.isGenerating) return

        viewModelScope.launch {
            _state.update {
                it.copy(step = CreateStep.Generating, isGenerating = true, generationError = null)
            }
            try {
                val intake = IntakePayload.build(s.intakeQuestions, s.intakeAnswers)
                val response: CreateBookResponse = ApiClient.post(
                    path = "/api/books",
                    body = CreateBookRequest(
                        profileId = profileId,
                        level = LevelPayload(age = 7, cefr = cefr.name),
                        genre = genre.wire,
                        intake = intake,
                    ),
                )
                _state.update { it.copy(createdBook = response.book, isGenerating = false) }
                // 표지 백그라운드 (멱등, 실패 무시).
                runCatching {
                    ApiClient.post<CoverResponse>(path = "/api/image/book/${response.book.id}/cover")
                }
            } catch (e: Throwable) {
                _state.update {
                    it.copy(isGenerating = false, generationError = "동화 생성에 실패했어요: ${e.message}")
                }
            }
        }
    }

    fun retryGenerate() = generate()
}

@Serializable
private data class IntakeRequest(val profileId: Int, val genre: String, val cefr: String)

@Serializable
private data class LevelPayload(val age: Int, val cefr: String)

@Serializable
private data class CreateBookRequest(
    val profileId: Int,
    val level: LevelPayload,
    val genre: String,
    val intake: IntakePayload,
)

@Serializable
private data class CreateBookResponse(val book: Book)

@Serializable
private data class CoverResponse(val coverImagePath: String? = null)
