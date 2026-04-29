package site.smap.harubook.core.audio

import android.content.Context
import android.media.AudioAttributes
import android.media.MediaPlayer
import io.ktor.client.HttpClient
import io.ktor.client.engine.okhttp.OkHttp
import io.ktor.client.request.get
import io.ktor.client.request.header
import io.ktor.client.statement.bodyAsBytes
import io.ktor.http.HttpHeaders
import io.ktor.http.URLBuilder
import io.ktor.http.takeFrom
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import site.smap.harubook.core.auth.AuthState
import site.smap.harubook.core.networking.AppConfig
import java.io.File

/**
 * passage 단위 오디오 재생기 (Singleton).
 *
 * 백엔드 TTS는 `/audio/passage-N.wav` 같은 인증 게이트 경로를 반환하므로
 * `Authorization: Bearer …` 헤더와 함께 다운로드한 뒤 임시 파일로 디스크 캐시 → MediaPlayer 재생.
 */
object AudioPlayer {

    /** 현재 재생 중인 passage id. null 이면 정지. */
    private val _nowPlayingPassageId = MutableStateFlow<Int?>(null)
    val nowPlayingPassageId: StateFlow<Int?> = _nowPlayingPassageId.asStateFlow()

    /** 다운로드/디코드 중인 passage id. */
    private val _preparingPassageId = MutableStateFlow<Int?>(null)
    val preparingPassageId: StateFlow<Int?> = _preparingPassageId.asStateFlow()

    private val _lastError = MutableStateFlow<String?>(null)
    val lastError: StateFlow<String?> = _lastError.asStateFlow()

    private var player: MediaPlayer? = null
    private var inFlightJob: Job? = null

    private val scope = CoroutineScope(Dispatchers.Main + SupervisorJob())
    private val client = HttpClient(OkHttp)

    private lateinit var cacheDir: File

    fun init(context: Context) {
        cacheDir = File(context.cacheDir, "audio").apply { mkdirs() }
    }

    /**
     * passage 재생 토글.
     */
    fun toggle(passageId: Int, audioPath: String?, context: Context) {
        if (_nowPlayingPassageId.value == passageId) {
            player?.let { p ->
                if (p.isPlaying) p.pause() else p.start()
            }
            return
        }
        if (audioPath.isNullOrEmpty()) {
            _lastError.value = "오디오가 아직 준비되지 않았습니다."
            return
        }
        startNew(passageId = passageId, audioPath = audioPath, context = context)
    }

    fun stop() {
        inFlightJob?.cancel()
        inFlightJob = null
        player?.run {
            try { stop() } catch (_: Throwable) {}
            release()
        }
        player = null
        _nowPlayingPassageId.value = null
        _preparingPassageId.value = null
    }

    private fun startNew(passageId: Int, audioPath: String, context: Context) {
        if (!::cacheDir.isInitialized) init(context)

        inFlightJob?.cancel()
        _preparingPassageId.value = passageId
        _nowPlayingPassageId.value = null
        player?.run {
            try { stop() } catch (_: Throwable) {}
            release()
        }
        player = null

        inFlightJob = scope.launch {
            try {
                val file = ensureLocalFile(passageId, audioPath)
                val mp = MediaPlayer().apply {
                    setAudioAttributes(
                        AudioAttributes.Builder()
                            .setUsage(AudioAttributes.USAGE_MEDIA)
                            .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
                            .build()
                    )
                    setDataSource(file.absolutePath)
                    setOnCompletionListener {
                        _nowPlayingPassageId.value = null
                    }
                    prepare()
                    start()
                }
                player = mp
                _nowPlayingPassageId.value = passageId
                _preparingPassageId.value = null
                _lastError.value = null
            } catch (_: kotlinx.coroutines.CancellationException) {
                // 다른 passage 요청으로 취소 — silent
            } catch (e: Throwable) {
                _preparingPassageId.value = null
                _lastError.value = "오디오 재생 실패: ${e.message ?: e::class.java.simpleName}"
            }
        }
    }

    private suspend fun ensureLocalFile(passageId: Int, audioPath: String): File =
        withContext(Dispatchers.IO) {
            val file = File(cacheDir, "passage-$passageId.wav")
            if (file.exists() && file.length() > 0) return@withContext file

            val url = URLBuilder().takeFrom(AppConfig.API_BASE_URL).apply {
                val segments = audioPath.trim('/').split('/').filter { it.isNotEmpty() }
                pathSegments = segments
            }.build()

            val bytes = client.get(url) {
                AuthState.peekAccessToken()?.let { token ->
                    header(HttpHeaders.Authorization, "Bearer $token")
                }
            }.bodyAsBytes()

            file.writeBytes(bytes)
            file
        }
}
