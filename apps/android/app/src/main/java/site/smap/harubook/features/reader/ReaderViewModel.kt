package site.smap.harubook.features.reader

import android.content.Context
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlinx.serialization.Serializable
import site.smap.harubook.core.audio.AudioPlayer
import site.smap.harubook.core.models.Book
import site.smap.harubook.core.models.BookDetail
import site.smap.harubook.core.models.Passage
import site.smap.harubook.core.models.ReadingLogResponse
import site.smap.harubook.core.models.VocabularyEntry
import site.smap.harubook.core.networking.ApiClient
import site.smap.harubook.core.srs.SrsGrade
import site.smap.harubook.core.srs.SrsStore

/**
 * 본문 텍스트 크기. SharedPreferences로 사용자 전역 선호도 영속화.
 */
enum class ReaderTextScale(val sp: Int, val label: String, val previewSp: Int) {
    Small(22, "작게", 12),
    Medium(28, "보통", 15),
    Large(34, "크게", 18),
    XLarge(40, "아주 크게", 22);

    companion object {
        private const val FILE = "harubook_reader"
        private const val KEY = "textScale"

        fun load(context: Context): ReaderTextScale {
            val raw = context.applicationContext
                .getSharedPreferences(FILE, Context.MODE_PRIVATE)
                .getString(KEY, null) ?: return Medium
            return runCatching { valueOf(raw) }.getOrDefault(Medium)
        }

        fun save(context: Context, value: ReaderTextScale) {
            context.applicationContext
                .getSharedPreferences(FILE, Context.MODE_PRIVATE)
                .edit().putString(KEY, value.name).apply()
        }
    }
}

data class ReaderUiState(
    val passages: List<Passage> = emptyList(),
    val vocabulary: List<VocabularyEntry> = emptyList(),
    val currentIndex: Int = 0,
    val showsKorean: Boolean = false,
    val isLoadingDetail: Boolean = true,
    val error: String? = null,
    val textScale: ReaderTextScale = ReaderTextScale.Medium,
    val readingLogId: Int? = null,
    val synthesizingPassageId: Int? = null,
    val generatingScenePassageId: Int? = null,
    /** 사용자가 본문에서 탭한 vocab. null이면 popover 닫힘. */
    val selectedVocab: VocabularyEntry? = null,
)

/**
 * iOS `ReaderViewModel.swift` 미러.
 *
 * 두 가지 백엔드 흐름을 함께 다룬다:
 *  - `/api/books/{id}` 로 본문/오디오/장면 메타데이터 로드
 *  - `/api/logs` POST/PATCH 로 reading_logs 진행률·완료 시각 누적 갱신
 *
 * 그리고 passage 오디오 부재 시 `/api/tts/{id}` 합성 트리거, 장면 이미지 부재 시
 * `/api/image/passage/{id}` 트리거.
 */
class ReaderViewModel(
    private val bookId: Int,
    private val profileId: Int,
    private val appContext: Context,
) : ViewModel() {

    private val _state = MutableStateFlow(ReaderUiState(textScale = ReaderTextScale.load(appContext)))
    val state: StateFlow<ReaderUiState> = _state.asStateFlow()

    private val srs: SrsStore = SrsStore.create(appContext, profileId)
    private var hasReportedFinish = false

    fun bootstrap() {
        viewModelScope.launch {
            coroutineScope {
                awaitAll(async { loadDetail() }, async { startLog() })
            }
        }
    }

    fun reportPageChanged(newIndex: Int) {
        viewModelScope.launch {
            val current = _state.value
            // 페이지 전환 시 한글 해석 자동 닫기 — 다음 문장은 영문부터.
            if (newIndex != current.currentIndex) {
                _state.update { it.copy(showsKorean = false) }
            }
            _state.update { it.copy(currentIndex = newIndex) }
            val passages = _state.value.passages
            if (passages.isEmpty()) return@launch
            val total = passages.size.coerceAtLeast(1)
            val ratio = (newIndex + 1).toDouble() / total.toDouble()
            patchLog(progressRatio = ratio, finishedAtUnix = null)
        }
    }

    fun leave() {
        if (hasReportedFinish) return
        hasReportedFinish = true
        val now = System.currentTimeMillis() / 1000
        viewModelScope.launch {
            patchLog(progressRatio = null, finishedAtUnix = now)
            AudioPlayer.stop()
        }
    }

    fun toggleKorean() {
        _state.update { it.copy(showsKorean = !it.showsKorean) }
    }

    fun setTextScale(scale: ReaderTextScale) {
        ReaderTextScale.save(appContext, scale)
        _state.update { it.copy(textScale = scale) }
    }

    /** 재생 토글. audioPath 부재 시 `/api/tts/{id}` 합성 먼저. */
    fun togglePlayback(passageIndex: Int) {
        val passage = _state.value.passages.getOrNull(passageIndex) ?: return
        val existing = passage.audioPath
        if (!existing.isNullOrEmpty()) {
            AudioPlayer.toggle(passage.id, existing)
            return
        }
        viewModelScope.launch {
            _state.update { it.copy(synthesizingPassageId = passage.id) }
            try {
                val response: TtsResponse = ApiClient.post(path = "/api/tts/${passage.id}")
                _state.update { st ->
                    st.copy(
                        passages = st.passages.map { p ->
                            if (p.id == passage.id) p.copy(audioPath = response.audioPath) else p
                        },
                        synthesizingPassageId = null,
                    )
                }
                AudioPlayer.toggle(passage.id, response.audioPath)
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

    /** 장면 이미지 합성(멱등). */
    fun requestSceneImage(passageIndex: Int) {
        val passage = _state.value.passages.getOrNull(passageIndex) ?: return
        if (!passage.sceneImagePath.isNullOrEmpty()) return

        viewModelScope.launch {
            _state.update { it.copy(generatingScenePassageId = passage.id) }
            try {
                val response: SceneImageResponse = ApiClient.post(path = "/api/image/passage/${passage.id}")
                _state.update { st ->
                    st.copy(
                        passages = st.passages.map { p ->
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

    fun selectVocab(entry: VocabularyEntry) {
        _state.update { it.copy(selectedVocab = entry) }
    }

    fun dismissVocab() {
        _state.update { it.copy(selectedVocab = null) }
    }

    fun gradeVocab(entry: VocabularyEntry, grade: SrsGrade) {
        srs.grade(entry.word, grade)
        _state.update { it.copy(selectedVocab = null) }
    }

    private suspend fun loadDetail() {
        try {
            val detail: BookDetail = ApiClient.get(path = "/api/books/$bookId")
            _state.update {
                it.copy(
                    passages = detail.passages.sortedBy { p -> p.orderIndex },
                    vocabulary = detail.book.vocabulary.orEmpty(),
                    isLoadingDetail = false,
                )
            }
        } catch (e: Throwable) {
            _state.update {
                it.copy(
                    isLoadingDetail = false,
                    error = e.message ?: "본문을 불러오지 못했어요.",
                )
            }
        }
    }

    private suspend fun startLog() {
        try {
            val response: ReadingLogResponse = ApiClient.post(
                path = "/api/logs",
                body = StartLogRequest(profileId = profileId, bookId = bookId),
            )
            _state.update { it.copy(readingLogId = response.log.id) }
        } catch (_: Throwable) {
            // 소프트 페일.
        }
    }

    private suspend fun patchLog(progressRatio: Double?, finishedAtUnix: Long?) {
        val logId = _state.value.readingLogId ?: return
        try {
            ApiClient.patch<ReadingLogResponse>(
                path = "/api/logs",
                body = PatchLogRequest(
                    id = logId,
                    progressRatio = progressRatio,
                    finishedAtUnix = finishedAtUnix,
                    quizScore = null,
                ),
            )
        } catch (_: Throwable) {
            // 소프트 페일.
        }
    }
}

@Serializable
internal data class StartLogRequest(val profileId: Int, val bookId: Int)

@Serializable
internal data class PatchLogRequest(
    val id: Int,
    val progressRatio: Double? = null,
    val finishedAtUnix: Long? = null,
    val quizScore: Int? = null,
)

@Serializable
internal data class TtsResponse(
    val passageId: Int,
    val audioPath: String,
    val cached: Boolean? = null,
    val bytes: Int? = null,
)

@Serializable
internal data class SceneImageResponse(
    val passageId: Int? = null,
    val sceneImagePath: String,
)
