package site.smap.harubook.features.vocab

import android.content.Context
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlinx.serialization.Serializable
import site.smap.harubook.core.audio.AudioPlayer
import site.smap.harubook.core.models.VocabEntry
import site.smap.harubook.core.models.VocabResponse
import site.smap.harubook.core.networking.ApiClient
import site.smap.harubook.core.srs.SrsGrade
import site.smap.harubook.core.srs.SrsStore
import site.smap.harubook.core.srs.VocabCardState
import site.smap.harubook.core.srs.srsNormalizeKey

/**
 * 단어장 플래시카드 + SRS 상태 — iOS `VocabViewModel.swift` 미러.
 *
 * 탭(오늘 학습/다시 학습/전체)별 deck 구성, grade 시 again→끝으로 이동·good→전진,
 * `POST /api/tts/word` 단어 발음 재생까지 iOS 동작과 동일하게 옮겼다.
 */
class VocabViewModel(
    private val profileId: Int,
    appContext: Context,
) : ViewModel() {

    enum class Tab(val label: String) {
        Review("오늘 학습"),
        // "몰라요" 누른 단어 = relearning. "모르는 단어"는 평가 이력 없는 새 단어와 혼동돼 의미 명확화.
        Unknown("다시 학습"),
        All("전체"),
    }

    companion object {
        /** 일일 학습 목표 = review deck 상한과 동일. */
        const val DAILY_GOAL: Int = 20
        const val REVIEW_DECK_LIMIT: Int = 20
    }

    /** SRS 저장소 — SharedPreferences 기반, 단말 단위. iOS UserDefaults 패리티. */
    private val srs: SrsStore = SrsStore.create(appContext, profileId)

    /** 단어별 TTS audioPath 캐시. 같은 단어 재호출 차단. iOS audioCache 패리티. */
    private val audioPathCache = mutableMapOf<String, String>()

    /** AudioPlayer 는 Int passageId 키 — 단어별 고정 정수 발급해 캐시 적중률을 유지. */
    private val ttsKeyMap = mutableMapOf<String, Int>()
    private var nextTtsKey: Int = 1_000_000

    /** 컴패니언 idle 복귀 타이머 — 연속 평가 시 이전 타이머 취소(웹 companionTimerRef 패리티). */
    private var companionJob: Job? = null

    private val _state = MutableStateFlow(VocabUiState())
    val state: StateFlow<VocabUiState> = _state.asStateFlow()

    fun load() {
        viewModelScope.launch {
            _state.update { it.copy(isLoading = true, error = null) }
            try {
                coroutineScope {
                    // 단어 목록과 SRS 진도를 병렬 — 다른 디바이스에서 평가한 진도와 통합된 상태로 시작.
                    val hydrate = async { srs.hydrateFromServer() }
                    val response: VocabResponse = ApiClient.get(
                        path = "/api/vocab",
                        query = mapOf("profileId" to profileId.toString()),
                    )
                    hydrate.await()
                    _state.update {
                        it.copy(
                            entries = dedupeVocabEntries(response.entries),
                            isLoading = false,
                            error = null,
                            index = 0,
                            isFlipped = false,
                            srsTickKey = it.srsTickKey + 1,
                        )
                    }
                }
            } catch (e: Throwable) {
                _state.update {
                    it.copy(
                        isLoading = false,
                        error = e.message ?: "단어장을 불러오지 못했어요.",
                    )
                }
            }
        }
    }

    fun selectTab(tab: Tab) {
        if (_state.value.tab == tab) return
        _state.update { it.copy(tab = tab, index = 0, isFlipped = false) }
    }

    fun flip() {
        _state.update { it.copy(isFlipped = !it.isFlipped) }
    }

    fun go(delta: Int) {
        val deck = computeDeck(_state.value.entries, _state.value.tab)
        val max = (deck.size - 1).coerceAtLeast(0)
        val next = (_state.value.index + delta).coerceIn(0, max)
        _state.update { it.copy(index = next, isFlipped = false) }
    }

    fun shuffle() {
        _state.update {
            it.copy(entries = it.entries.shuffled(), index = 0, isFlipped = false)
        }
    }

    fun grade(g: SrsGrade) {
        val cur = currentEntry() ?: return
        srs.grade(cur.word, g)

        // 컴패니언 반응 — 정답으로 마스터에 도달하면 축하, 아니면 정/오답 반응.
        // 잠시 뒤 idle 복귀(연속 평가 시 타이머 리셋). 웹 vocab-deck grade 패리티.
        val mastered = g == SrsGrade.Good && srs.isMastered(cur.word)
        val companion = when {
            mastered -> CompanionState.Celebrate
            g == SrsGrade.Good -> CompanionState.Correct
            else -> CompanionState.Wrong
        }

        _state.update { st ->
            if (g == SrsGrade.Again) {
                // 현재 단어를 entries 끝으로 이동 — 즉시 한 번 더 노출.
                val key = srsNormalizeKey(cur.word)
                val without = st.entries.filterNot { srsNormalizeKey(it.word) == key }
                val newEntries = without + cur
                val newDeckSize = computeDeck(newEntries, st.tab).size
                st.copy(
                    entries = newEntries,
                    index = st.index.coerceAtMost((newDeckSize - 1).coerceAtLeast(0)),
                    isFlipped = false,
                    srsTickKey = st.srsTickKey + 1,
                    companionState = companion,
                    companionPulse = st.companionPulse + 1,
                )
            } else {
                // 한 칸 전진 — 마지막이면 유지. (good 의 경우 mastered 되면 deck 에서 빠져 자연스레 다음 단어 노출.)
                val newDeckSize = computeDeck(st.entries, st.tab).size
                val next = (st.index + 1).coerceAtMost((newDeckSize - 1).coerceAtLeast(0))
                st.copy(
                    index = next,
                    isFlipped = false,
                    srsTickKey = st.srsTickKey + 1,
                    companionState = companion,
                    companionPulse = st.companionPulse + 1,
                )
            }
        }

        companionJob?.cancel()
        companionJob = viewModelScope.launch {
            delay(if (mastered) 2_600 else 1_800)
            _state.update { it.copy(companionState = CompanionState.Idle) }
        }
    }

    /** `POST /api/tts/word` 로 wav 경로 받고 [AudioPlayer] 재생. 같은 단어 캐시. iOS speak 패리티. */
    fun speak(word: String) {
        if (_state.value.speakingWord != null) return
        _state.update { it.copy(speakingWord = word) }
        viewModelScope.launch {
            try {
                val audioPath = audioPathCache[word] ?: run {
                    val response: WordTtsResponse = ApiClient.post(
                        path = "/api/tts/word",
                        body = WordTtsRequest(text = word),
                    )
                    audioPathCache[word] = response.audioPath
                    response.audioPath
                }
                val ttsKey = ttsKeyMap.getOrPut(word) { nextTtsKey++ }
                AudioPlayer.toggle(passageId = ttsKey, audioPath = audioPath)
            } catch (_: Throwable) {
                // 발음 실패는 사용자 흐름을 막지 않는다.
            } finally {
                _state.update { it.copy(speakingWord = null) }
            }
        }
    }

    // MARK: - SRS 노출 (Composable 에서 카드 칩/레벨 표시용)

    fun cardState(word: String): VocabCardState = srs.cardState(word)
    fun srsLevel(word: String): Int = srs.item(word)?.level ?: 0

    // MARK: - Deck composition

    /** 현재 탭에 보일 deck — Composable 에서 `remember(state)` 로 호출. */
    fun deck(): List<VocabEntry> = computeDeck(_state.value.entries, _state.value.tab)

    fun currentEntry(): VocabEntry? = deck().getOrNull(_state.value.index)

    /**
     * 마스터 제외 + tab별 deck.
     * "오늘 학습"은 새 단어 먼저, 그 다음 복습 도래 단어 — 학습 곡선을 자연스럽게.
     */
    private fun computeDeck(entries: List<VocabEntry>, tab: Tab): List<VocabEntry> = when (tab) {
        Tab.All -> entries.filter { !srs.isMastered(it.word) }
        Tab.Unknown -> entries.filter { srs.isUnknown(it.word) }
        Tab.Review -> {
            val candidates = entries.filter { srs.isDue(it.word) && !srs.isMastered(it.word) }
            // 새 단어 우선, 동일 카테고리 내에서는 원본 순서 유지(stable).
            val sorted = candidates.sortedByDescending { srs.isNew(it.word) }
            sorted.take(REVIEW_DECK_LIMIT)
        }
    }

    // MARK: - 배지/카운터 (UI 에서 직접 호출. srsTickKey 변경 시 재계산되도록 collectAsState 와 함께 사용.)

    fun dueCount(): Int {
        val raw = _state.value.entries.count { srs.isDue(it.word) && !srs.isMastered(it.word) }
        return raw.coerceAtMost(REVIEW_DECK_LIMIT)
    }

    fun unknownCount(): Int = _state.value.entries.count { srs.isUnknown(it.word) }

    /** "전체" 탭 배지 — 마스터 제외한 남은 학습 대상. */
    fun remainingCount(): Int = _state.value.entries.count { !srs.isMastered(it.word) }

    fun masteredCount(): Int = _state.value.entries.count { srs.isMastered(it.word) }

    fun gradedTodayCount(): Int = srs.gradedTodayCount()

    /** 0.0 ~ 1.0 — ProgressIndicator value. */
    fun dailyGoalProgress(): Float =
        (gradedTodayCount().toFloat() / DAILY_GOAL.toFloat()).coerceAtMost(1f)

    /** "오늘 학습" 세션 종료 여부 — 진입 직후 0/0이면 아직 시작 안 한 상태로 false. */
    fun isSessionComplete(): Boolean =
        _state.value.tab == Tab.Review && deck().isEmpty() && gradedTodayCount() > 0
}

/**
 * `srsTickKey` 는 SRS state 변화(grade/hydrate) 시 증가 — Composable 의 derivedStateOf 가
 * 재계산되도록 신호 역할. SrsStore 가 StateFlow 가 아니므로 명시적 신호 필요.
 */
data class VocabUiState(
    val entries: List<VocabEntry> = emptyList(),
    val tab: VocabViewModel.Tab = VocabViewModel.Tab.Review,
    val index: Int = 0,
    val isFlipped: Boolean = false,
    val isLoading: Boolean = false,
    val error: String? = null,
    val speakingWord: String? = null,
    val srsTickKey: Int = 0,
    /** 학습 컴패니언 — 평가 이벤트에 반응 후 idle 복귀. 웹 companionState 패리티. */
    val companionState: CompanionState = CompanionState.Idle,
    /** 같은 상태 연속 시에도 연출·문구가 갱신되도록 하는 카운터. */
    val companionPulse: Int = 0,
)

@Serializable
private data class WordTtsRequest(val text: String)

@Serializable
private data class WordTtsResponse(val audioPath: String)
