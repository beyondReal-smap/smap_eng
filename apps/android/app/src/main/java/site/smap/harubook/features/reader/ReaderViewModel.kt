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
import kotlinx.serialization.builtins.ListSerializer
import kotlinx.serialization.builtins.serializer
import kotlinx.serialization.json.Json
import site.smap.harubook.core.audio.AudioPlayer
import site.smap.harubook.core.models.Book
import site.smap.harubook.core.models.BookDetail
import site.smap.harubook.core.models.Mission
import site.smap.harubook.core.models.Passage
import site.smap.harubook.core.models.ReadingLogResponse
import site.smap.harubook.core.models.VocabularyEntry
import site.smap.harubook.core.networking.ApiClient
import site.smap.harubook.core.srs.SrsGrade
import site.smap.harubook.core.srs.SrsStore
import site.smap.harubook.core.srs.srsNormalizeKey

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
    /** 책 메타데이터 — 헤더에 제목/나이 배지/CEFR 배지를 표시하려면 필수. iOS 패리티(viewModel.book). */
    val book: Book? = null,
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
    /** passageIndex → 검증된 미션. 레거시 책(missions 부재)은 빈 맵 — 미션 UI 없음. */
    val missionByIndex: Map<Int, Mission> = emptyMap(),
    /** 완료한 미션의 passageIndex 집합. SharedPreferences로 복원/영속화. */
    val completedMissions: Set<Int> = emptySet(),
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

    private val _state = MutableStateFlow(
        ReaderUiState(
            textScale = ReaderTextScale.load(appContext),
            completedMissions = loadCompletedMissions(),
        ),
    )
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
            // 떠나는 페이지의 오디오 정지 — 문장이 3~6문장으로 길어져(오디오 30초+) 이전
            // 낭독이 다음 페이지까지 이어지면 "정지가 안 된다"는 혼란을 만든다. iOS pageChanged 패리티.
            val playingId = AudioPlayer.state.value.nowPlayingPassageId
            if (playingId != null && passages.getOrNull(newIndex)?.id != playingId) {
                AudioPlayer.stop()
            }
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
                // passage가 3~6문장(최대 ~95단어)으로 길어져 합성이 기본 60s에
                // 근접할 수 있어 90s로 상향. iOS ReaderViewModel과 패리티.
                val response: TtsResponse = ApiClient.post(
                    path = "/api/tts/${passage.id}",
                    timeoutMillis = 90_000,
                )
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

    // MARK: - 책 속 미션 (웹 reader.tsx missionByIdx/handleWordTap/completeMission 패리티)

    /**
     * 워드 헌트 판정 — 해당 passage에 미완료 워드 헌트가 있고, 탭한 단어가 targetWord와
     * 일치하면 완료. 그 외의 단어 탭은 기존 뜻 보기 동작 그대로(이 함수는 부수 판정만).
     * normalize는 SRS와 동일한 trim+lowercase+구두점 제거([srsNormalizeKey]) 재사용.
     */
    fun reportWordTapped(passageIndex: Int, word: String) {
        val current = _state.value
        val hunt = current.missionByIndex[passageIndex]?.wordHunt ?: return
        if (current.completedMissions.contains(passageIndex)) return
        if (srsNormalizeKey(word) == srsNormalizeKey(hunt.targetWord)) {
            completeMission(passageIndex)
        }
    }

    /** 미션 완료 — 상태 갱신 + SharedPreferences 영속화(웹 localStorage missionKey 패리티). */
    fun completeMission(passageIndex: Int) {
        if (_state.value.completedMissions.contains(passageIndex)) return
        val next = _state.value.completedMissions + passageIndex
        _state.update { it.copy(completedMissions = next) }
        persistCompletedMissions(next)
    }

    /** ReaderTextScale과 같은 리더 전용 prefs 파일. */
    private fun readerPrefs() =
        appContext.applicationContext.getSharedPreferences("harubook_reader", Context.MODE_PRIVATE)

    /** 웹 localStorage 키(`reader:mission:{bookId}`)와 동일한 네이밍 — 정수 배열 JSON. */
    private fun missionStorageKey(): String = "reader:mission:$bookId"

    /** 완료 미션 복원 — 정수 배열(JSON)만 신뢰, 손상 시 빈 집합(fail-soft). */
    private fun loadCompletedMissions(): Set<Int> {
        val raw = readerPrefs().getString(missionStorageKey(), null) ?: return emptySet()
        return runCatching {
            Json.decodeFromString(ListSerializer(Int.serializer()), raw).toSet()
        }.getOrDefault(emptySet())
    }

    private fun persistCompletedMissions(done: Set<Int>) {
        readerPrefs().edit()
            .putString(
                missionStorageKey(),
                Json.encodeToString(ListSerializer(Int.serializer()), done.toList()),
            )
            .apply()
    }

    /**
     * passageIndex → Mission 맵 — 웹 reader.tsx missionByIdx 패리티.
     * 저장 시 서버가 범위/단어 존재를 이미 검증했지만(fail-soft), 레거시/수동 편집 대비
     *  - passageIndex 범위 밖 → 무시
     *  - 워드 헌트는 vocabulary에 있는 단어일 때만 유효(탭 대상이 밑줄 단어뿐이므로)
     *  - check는 질문/2지선다가 온전할 때만 유효(부분 파싱된 미션이 빈 카드로 뜨지 않게)
     */
    private fun buildMissionMap(
        missions: List<Mission>?,
        vocabulary: List<VocabularyEntry>,
        passageCount: Int,
    ): Map<Int, Mission> {
        if (missions.isNullOrEmpty()) return emptyMap()
        val vocabMap = buildVocabMap(vocabulary)
        val map = LinkedHashMap<Int, Mission>()
        for (m in missions) {
            if (m.passageIndex < 0 || m.passageIndex >= passageCount) continue
            val hunt = m.wordHunt?.takeIf {
                it.targetWord.isNotBlank() && vocabMap.containsKey(normalizeVocabKey(it.targetWord))
            }
            val check = m.check?.takeIf {
                it.question.isNotBlank() && it.choices.size >= 2 && it.answerIndex in it.choices.indices
            }
            if (hunt == null && check == null) continue
            map[m.passageIndex] = m.copy(wordHunt = hunt, check = check)
        }
        return map
    }

    private suspend fun loadDetail() {
        try {
            val detail: BookDetail = ApiClient.get(path = "/api/books/$bookId")
            val sorted = detail.passages.sortedBy { p -> p.orderIndex }
            _state.update {
                it.copy(
                    book = detail.book,
                    passages = sorted,
                    vocabulary = detail.book.vocabulary.orEmpty(),
                    missionByIndex = buildMissionMap(
                        missions = detail.book.missions,
                        vocabulary = detail.book.vocabulary.orEmpty(),
                        passageCount = sorted.size,
                    ),
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
