package site.smap.harubook.features.reader

import android.content.Context
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlinx.serialization.Serializable
import site.smap.harubook.core.audio.AudioPlayer
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
    val isLoadingDetail: Boolean = true,
    val error: String? = null,
    val readingLogId: Int? = null,
    val synthesizingPassageId: Int? = null,
    val generatingScenePassageId: Int? = null,
)

class ReaderViewModel(
    val bookId: Int,
    val profileId: Int,
) : ViewModel() {

    private val _state = MutableStateFlow(ReaderUiState())
    val state: StateFlow<ReaderUiState> = _state.asStateFlow()

    private var hasReportedFinish: Boolean = false

    fun bootstrap() {
        loadDetail()
        startLog()
    }

    fun reportPageChanged(index: Int) {
        _state.update { it.copy(currentIndex = index) }
        val passages = _state.value.passages
        if (passages.isEmpty()) return
        val total = passages.size.coerceAtLeast(1)
        val ratio = (index + 1).toDouble() / total.toDouble()
        patchLog(progressRatio = ratio, finishedAtUnix = null)
    }

    fun toggleKorean() {
        _state.update { it.copy(showsKorean = !it.showsKorean) }
    }

    fun togglePlayback(passageIndex: Int, context: Context) {
        val passage = _state.value.passages.getOrNull(passageIndex) ?: return
        val cachedPath = passage.audioPath

        if (!cachedPath.isNullOrEmpty()) {
            AudioPlayer.toggle(passageId = passage.id, audioPath = cachedPath, context = context)
            return
        }

        viewModelScope.launch {
            _state.update { it.copy(synthesizingPassageId = passage.id) }
            try {
                val response: TtsResponse = ApiClient.post("/api/tts/${passage.id}")
                _state.update { s ->
                    s.copy(
                        passages = s.passages.map { p ->
                            if (p.id == passage.id) p.copy(audioPath = response.audioPath) else p
                        },
                        synthesizingPassageId = null,
                    )
                }
                AudioPlayer.toggle(passageId = passage.id, audioPath = response.audioPath, context = context)
            } catch (e: Throwable) {
                _state.update {
                    it.copy(
                        synthesizingPassageId = null,
                        error = "오디오 준비 실패: ${e.message ?: e::class.java.simpleName}",
                    )
                }
            }
        }
    }

    fun leave() {
        if (hasReportedFinish) return
        hasReportedFinish = true
        val now = System.currentTimeMillis() / 1000
        patchLog(progressRatio = null, finishedAtUnix = now)
        AudioPlayer.stop()
    }

    /** 장면 이미지 생성 (`POST /api/image/passage/[id]`). 멱등. */
    fun requestSceneImage(passageIndex: Int) {
        val passage = _state.value.passages.getOrNull(passageIndex) ?: return
        if (!passage.sceneImagePath.isNullOrEmpty()) return

        viewModelScope.launch {
            _state.update { it.copy(generatingScenePassageId = passage.id) }
            try {
                val response: SceneImageResponse = ApiClient.post("/api/image/passage/${passage.id}")
                _state.update { s ->
                    s.copy(
                        passages = s.passages.map { p ->
                            if (p.id == passage.id) p.copy(sceneImagePath = response.sceneImagePath) else p
                        },
                        generatingScenePassageId = null,
                    )
                }
            } catch (e: Throwable) {
                _state.update {
                    it.copy(
                        generatingScenePassageId = null,
                        error = "삽화 생성 실패: ${e.message ?: e::class.java.simpleName}",
                    )
                }
            }
        }
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
                        isLoadingDetail = false,
                        error = null,
                    )
                }
            } catch (e: Throwable) {
                _state.update {
                    it.copy(
                        isLoadingDetail = false,
                        error = e.message ?: "책을 불러오지 못했습니다.",
                    )
                }
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
                _state.update { it.copy(readingLogId = response.log.id) }
            } catch (_: Throwable) {
                // 소프트 페일
            }
        }
    }

    private fun patchLog(progressRatio: Double?, finishedAtUnix: Long?) {
        val id = _state.value.readingLogId ?: return
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
                // 소프트 페일
            }
        }
    }
}

@Serializable
private data class TtsResponse(
    val passageId: Int,
    val audioPath: String,
    val cached: Boolean? = null,
    val bytes: Long? = null,
)

@Serializable
private data class SceneImageResponse(
    val passageId: Int? = null,
    val sceneImagePath: String,
)
