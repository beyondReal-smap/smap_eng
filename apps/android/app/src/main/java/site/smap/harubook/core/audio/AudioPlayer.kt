package site.smap.harubook.core.audio

import android.annotation.SuppressLint
import android.content.Context
import android.media.MediaPlayer
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import site.smap.harubook.core.networking.ApiClient
import java.io.File

/**
 * iOS `AudioPlayer.swift` 미러. 단일 인스턴스로 한 번에 한 passage 만 재생.
 *
 * 인증 게이트 미디어(`/api/static/audio/...`)를 [ApiClient.downloadAuthenticated] 로 받아
 * 캐시 디렉토리에 LRU-lite(최대 5개)로 저장하고 [MediaPlayer] 로 재생한다.
 * Media3 ExoPlayer 대신 [MediaPlayer] 를 사용하는 이유는 단일 passage·짧은 길이라
 * 추가 의존성 + ByteArrayDataSource 구현 비용이 정당화되지 않기 때문.
 */
@SuppressLint("StaticFieldLeak")
object AudioPlayer {

    private lateinit var appContext: Context
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main)

    private val _state = MutableStateFlow(State())
    val state: StateFlow<State> = _state.asStateFlow()

    @Volatile private var player: MediaPlayer? = null
    @Volatile private var inFlight: Job? = null
    private val cacheIndex = LinkedHashMap<Int, File>(8, 0.75f, true)
    private const val MAX_CACHE = 5

    data class State(
        val nowPlayingPassageId: Int? = null,
        /** 일시정지 여부 — pause 시에도 nowPlayingPassageId는 유지되므로(재개용),
         *  버튼 라벨("듣기"↔"정지")은 이 플래그까지 봐야 한다. */
        val isPaused: Boolean = false,
        val preparingPassageId: Int? = null,
        val lastError: String? = null,
    ) {
        val isPlaying: Boolean get() = nowPlayingPassageId != null && !isPaused

        /** 해당 passage가 실제로 소리를 내며 재생 중인지 — 라벨/하이라이트 판정용. */
        fun isActivelyPlaying(passageId: Int?): Boolean =
            passageId != null && nowPlayingPassageId == passageId && !isPaused
    }

    fun init(context: Context) {
        if (::appContext.isInitialized) return
        appContext = context.applicationContext
    }

    /** 같은 passage면 일시정지/재개 토글, 다른 passage면 새 재생. */
    fun toggle(passageId: Int, audioPath: String?) {
        val current = _state.value
        if (current.nowPlayingPassageId == passageId) {
            val p = player ?: return
            if (p.isPlaying) {
                p.pause()
                _state.update { it.copy(isPaused = true) }
            } else {
                p.start()
                _state.update { it.copy(isPaused = false) }
            }
            return
        }
        if (audioPath.isNullOrEmpty()) {
            _state.update { it.copy(lastError = "오디오가 아직 준비되지 않았습니다.") }
            return
        }
        startNew(passageId, audioPath)
    }

    fun stop() {
        inFlight?.cancel()
        inFlight = null
        runCatching { player?.stop() }
        runCatching { player?.release() }
        player = null
        _state.update { State(lastError = it.lastError) }
    }

    private fun startNew(passageId: Int, audioPath: String) {
        inFlight?.cancel()
        runCatching { player?.stop() }
        runCatching { player?.release() }
        player = null
        _state.update {
            it.copy(preparingPassageId = passageId, nowPlayingPassageId = null, isPaused = false)
        }

        inFlight = scope.launch {
            try {
                val file = withContext(Dispatchers.IO) { fetchFile(passageId, audioPath) }
                val mp = MediaPlayer().apply {
                    setDataSource(file.absolutePath)
                    setOnCompletionListener {
                        _state.update { it.copy(nowPlayingPassageId = null, isPaused = false) }
                    }
                    setOnErrorListener { _, what, extra ->
                        _state.update { it.copy(preparingPassageId = null, lastError = "오디오 오류 ($what/$extra)") }
                        true
                    }
                    prepare()
                    start()
                }
                player = mp
                _state.update {
                    it.copy(
                        nowPlayingPassageId = passageId,
                        preparingPassageId = null,
                        lastError = null,
                    )
                }
            } catch (_: kotlinx.coroutines.CancellationException) {
                // 다른 passage 가 들어와 취소된 경우 — silent.
            } catch (e: Throwable) {
                _state.update {
                    it.copy(
                        preparingPassageId = null,
                        lastError = "오디오 재생 실패: ${e.message ?: e::class.java.simpleName}",
                    )
                }
            }
        }
    }

    private suspend fun fetchFile(passageId: Int, audioPath: String): File {
        cacheIndex[passageId]?.takeIf { it.exists() }?.let { return it }

        val bytes = ApiClient.downloadAuthenticated(audioPath)
        val dir = File(appContext.cacheDir, "audio").apply { mkdirs() }
        val file = File(dir, "passage-$passageId.wav")
        file.writeBytes(bytes)

        cacheIndex[passageId] = file
        while (cacheIndex.size > MAX_CACHE) {
            val oldest = cacheIndex.entries.iterator().next()
            runCatching { oldest.value.delete() }
            cacheIndex.remove(oldest.key)
        }
        return file
    }
}
