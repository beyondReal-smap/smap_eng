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

/**
 * iOS `QuizViewModel.swift` 미러.
 *
 * 흐름:
 *  1. load() → POST /api/books/{id}/quiz 로 4지선다 5문제 생성/로드(서버 캐시).
 *  2. selectAnswer / next / prev 진행.
 *  3. submit() → reading_logs PATCH(quizScore + finishedAtUnix) + phase=Finished.
 */
class QuizViewModel(
    private val bookId: Int,
    private val readingLogId: Int?,
) : ViewModel() {

    sealed class Phase {
        data object Loading : Phase()
        data object Answering : Phase()
        data object Finished : Phase()
        data class Error(val message: String) : Phase()
    }

    data class UiState(
        val phase: Phase = Phase.Loading,
        val quizzes: List<Quiz> = emptyList(),
        val selections: Map<Int, Int> = emptyMap(),
        val currentIndex: Int = 0,
        val isSubmitting: Boolean = false,
    ) {
        val currentQuiz: Quiz? get() = quizzes.getOrNull(currentIndex)
        val totalQuestions: Int get() = quizzes.size
        val isLastQuestion: Boolean get() = currentIndex + 1 >= quizzes.size
        val score: Int get() = quizzes.count { selections[it.id] == it.answerIndex }
    }

    private val _state = MutableStateFlow(UiState())
    val state: StateFlow<UiState> = _state.asStateFlow()

    fun load() {
        viewModelScope.launch {
            _state.update { it.copy(phase = Phase.Loading) }
            try {
                val response: QuizzesResponse = ApiClient.post(path = "/api/books/$bookId/quiz")
                val sorted = response.quizzes.sortedBy { it.orderIndex }
                _state.update {
                    it.copy(
                        quizzes = sorted,
                        phase = if (sorted.isEmpty()) Phase.Error("퀴즈를 가져오지 못했습니다.") else Phase.Answering,
                    )
                }
            } catch (e: Throwable) {
                _state.update {
                    it.copy(phase = Phase.Error("퀴즈 로드 실패: ${e.message ?: e::class.java.simpleName}"))
                }
            }
        }
    }

    fun selectAnswer(choiceIndex: Int) {
        val quiz = _state.value.currentQuiz ?: return
        _state.update { it.copy(selections = it.selections + (quiz.id to choiceIndex)) }
    }

    fun goToNext() {
        _state.update { st ->
            if (st.currentIndex + 1 < st.quizzes.size) st.copy(currentIndex = st.currentIndex + 1) else st
        }
    }

    fun goToPrevious() {
        _state.update { st ->
            if (st.currentIndex > 0) st.copy(currentIndex = st.currentIndex - 1) else st
        }
    }

    fun submit() {
        val st = _state.value
        if (st.isSubmitting || st.quizzes.isEmpty()) return
        _state.update { it.copy(isSubmitting = true) }

        viewModelScope.launch {
            readingLogId?.let { logId ->
                try {
                    ApiClient.patch<ReadingLogResponse>(
                        path = "/api/logs",
                        body = PatchLogRequest(
                            id = logId,
                            progressRatio = null,
                            finishedAtUnix = System.currentTimeMillis() / 1000,
                            quizScore = st.score,
                        ),
                    )
                } catch (_: Throwable) {
                    // 점수 저장 실패해도 결과 화면은 보여준다.
                }
            }
            _state.update { it.copy(isSubmitting = false, phase = Phase.Finished) }
        }
    }

    fun restart() {
        _state.update { it.copy(selections = emptyMap(), currentIndex = 0, phase = Phase.Answering) }
    }
}

@Serializable
internal data class PatchLogRequest(
    val id: Int,
    val progressRatio: Double? = null,
    val finishedAtUnix: Long? = null,
    val quizScore: Int? = null,
)
