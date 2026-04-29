package site.smap.harubook.features.reader

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import site.smap.harubook.core.models.BookDetail
import site.smap.harubook.core.models.Passage
import site.smap.harubook.core.models.PatchLogRequest
import site.smap.harubook.core.models.ReadingLogResponse
import site.smap.harubook.core.models.StartLogRequest
import site.smap.harubook.core.networking.ApiClient

data class ReaderUiState(
    val passages: List<Passage> = emptyList(),
    val title: String = "",
    val age: Int = 0,
    val cefrLabel: String = "",
    val currentIndex: Int = 0,
    val showsKorean: Boolean = false,
    val isLoading: Boolean = true,
    val error: String? = null,
)

class ReaderViewModel(
    val bookId: Int,
    val profileId: Int,
) : ViewModel() {

    private val _state = MutableStateFlow(ReaderUiState())
    val state: StateFlow<ReaderUiState> = _state.asStateFlow()

    private var logId: Int? = null
    private var hasReportedFinish: Boolean = false

    fun bootstrap() {
        loadDetail()
        startLog()
    }

    fun reportPageChanged(index: Int) {
        _state.update { it.copy(currentIndex = index) }
        val total = _state.value.passages.size.coerceAtLeast(1)
        val ratio = (index + 1).toDouble() / total.toDouble()
        patchLog(progressRatio = ratio, finishedAtUnix = null)
    }

    fun toggleKorean() {
        _state.update { it.copy(showsKorean = !it.showsKorean) }
    }

    fun leave() {
        if (hasReportedFinish) return
        hasReportedFinish = true
        val now = System.currentTimeMillis() / 1000
        patchLog(progressRatio = null, finishedAtUnix = now)
    }

    private fun loadDetail() {
        viewModelScope.launch {
            try {
                val detail: BookDetail = ApiClient.get("/api/books/$bookId")
                _state.update {
                    it.copy(
                        passages = detail.passages.sortedBy { p -> p.orderIndex },
                        title = detail.book.title,
                        age = detail.book.age,
                        cefrLabel = detail.book.cefr.label,
                        isLoading = false,
                        error = null,
                    )
                }
            } catch (e: Throwable) {
                _state.update { it.copy(isLoading = false, error = e.message ?: "책을 불러오지 못했습니다.") }
            }
        }
    }

    private fun startLog() {
        viewModelScope.launch {
            try {
                val response: ReadingLogResponse = ApiClient.post(
                    path = "/api/logs",
                    body = StartLogRequest(profileId = profileId, bookId = bookId),
                )
                logId = response.log.id
            } catch (_: Throwable) {
                // soft fail — 로그 없이도 리더 동작
            }
        }
    }

    private fun patchLog(progressRatio: Double?, finishedAtUnix: Long?) {
        val id = logId ?: return
        viewModelScope.launch {
            try {
                ApiClient.patch<ReadingLogResponse>(
                    path = "/api/logs",
                    body = PatchLogRequest(
                        id = id,
                        progressRatio = progressRatio,
                        finishedAtUnix = finishedAtUnix,
                    ),
                )
            } catch (_: Throwable) {
                // soft fail
            }
        }
    }
}
