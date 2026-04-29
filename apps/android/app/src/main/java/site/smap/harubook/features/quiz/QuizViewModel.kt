package site.smap.harubook.features.quiz

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlinx.serialization.Serializable
import site.smap.harubook.core.models.Quiz
import site.smap.harubook.core.models.QuizzesResponse
import site.smap.harubook.core.models.ReadingLogResponse
import site.smap.harubook.core.networking.ApiClient

sealed interface QuizPhase {
    data object Loading : QuizPhase
    data object Answering : QuizPhase
    data object Finished : QuizPhase
    data class Error(val message: String) : QuizPhase
}

data class QuizUiState(
    val quizzes: List<Quiz> = emptyList(),
    val selections: Map<Int, Int> = emptyMap(),
    val currentIndex: Int = 0,
    val phase: QuizPhase = QuizPhase.Loading,
    val isSubmitting: Boolean = false,
)

class QuizViewModel(
    val bookId: Int,
    val bookTitle: String,
    val readingLogId: Int?,
) : ViewModel() {

    private val _state = MutableStateFlow(QuizUiState())
    val state: StateFlow<QuizUiState> = _state.asStateFlow()

    val totalQuestions: Int get() = _state.value.quizzes.size
    val currentQuiz: Quiz? get() = _state.value.quizzes.getOrNull(_state.value.currentIndex)
    val isLastQuestion: Boolean get() = _state.value.currentIndex + 1 >= totalQuestions
    val score: Int
        get() = _state.value.quizzes.count { quiz ->
            _state.value.selections[quiz.id] == quiz.answerIndex
        }

    fun load() {
        viewModelScope.launch {
            _state.update { it.copy(phase = QuizPhase.Loading) }
            try {
                val response: QuizzesResponse = ApiClient.post("/api/books/$bookId/quiz")
                val sorted = response.quizzes.sortedBy { it.orderIndex }
                _state.update {
                    it.copy(
                        quizzes = sorted,
                        phase = if (sorted.isEmpty()) QuizPhase.Error("퀴즈를 가져오지 못했습니다.") else QuizPhase.Answering,
                    )
                }
            } catch (e: Throwable) {
                _state.update { it.copy(phase = QuizPhase.Error("퀴즈 로드 실패: ${e.message}")) }
            }
        }
    }

    fun selectAnswer(index: Int) {
        val quiz = currentQuiz ?: return
        _state.update { s ->
            // 이미 선택됐으면 무시 (즉시 피드백 후 변경 불가)
            if (s.selections.containsKey(quiz.id)) s
            else s.copy(selections = s.selections + (quiz.id to index))
        }
    }

    fun goToNext() {
        if (_state.value.currentIndex + 1 < _state.value.quizzes.size) {
            _state.update { it.copy(currentIndex = it.currentIndex + 1) }
        }
    }

    fun submit() {
        if (_state.value.isSubmitting || _state.value.quizzes.isEmpty()) return
        viewModelScope.launch {
            _state.update { it.copy(isSubmitting = true) }
            try {
                readingLogId?.let { logId ->
                    val now = System.currentTimeMillis() / 1000
                    runCatching {
                        ApiClient.patch<ReadingLogResponse>(
                            path = "/api/logs",
                            body = PatchLogScore(
                                id = logId,
                                progressRatio = null,
                                finishedAtUnix = now,
                                quizScore = score
                            ),
                        )
                    }
                }
            } finally {
                _state.update { it.copy(isSubmitting = false, phase = QuizPhase.Finished) }
            }
        }
    }

    fun restart() {
        _state.update {
            it.copy(
                selections = emptyMap(),
                currentIndex = 0,
                phase = QuizPhase.Answering,
            )
        }
    }
}

@Serializable
private data class PatchLogScore(
    val id: Int,
    val progressRatio: Double? = null,
    val finishedAtUnix: Long? = null,
    val quizScore: Int? = null,
)
