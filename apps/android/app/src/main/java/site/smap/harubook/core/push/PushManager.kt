package site.smap.harubook.core.push

import android.annotation.SuppressLint
import android.content.Context
import android.content.SharedPreferences
import com.google.firebase.messaging.FirebaseMessaging
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlinx.serialization.Serializable
import site.smap.harubook.core.networking.ApiClient
import kotlin.coroutines.resume
import kotlin.coroutines.resumeWithException

/**
 * FCM 토큰 수명주기 + 백엔드 등록/해제. iOS `PushManager.swift` 패리티.
 *
 * 흐름
 *   - 앱 시작 시 [refresh] → FirebaseMessaging.getToken() → POST /api/push/register
 *   - 새 토큰 발급 시 [HarubookFirebaseMessagingService.onNewToken] 가 [register] 호출
 *   - 로그아웃 시 [unregister] → POST /api/push/unregister
 *
 * 등록 실패는 사용자 흐름을 막지 않는다(soft fail). 다음 앱 시작 시 다시 시도.
 */
@SuppressLint("StaticFieldLeak")
object PushManager {
    private const val PREFS_FILE = "harubook_push"
    private const val KEY_REGISTERED_TOKEN = "registered_token"

    private lateinit var appContext: Context
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    private val _registeredToken = MutableStateFlow<String?>(null)
    val registeredToken: StateFlow<String?> = _registeredToken.asStateFlow()

    fun init(context: Context) {
        if (::appContext.isInitialized) return
        appContext = context.applicationContext
        _registeredToken.value = prefs().getString(KEY_REGISTERED_TOKEN, null)
    }

    private fun prefs(): SharedPreferences =
        appContext.getSharedPreferences(PREFS_FILE, Context.MODE_PRIVATE)

    /** 현재 토큰을 받아 백엔드에 등록. 로그인 직후 + 콜드 스타트 시 호출. */
    fun refresh() {
        scope.launch {
            val token = runCatching { fetchToken() }.getOrNull() ?: return@launch
            register(token)
        }
    }

    /** 새 토큰 발급 시 호출(`onNewToken`). */
    fun register(token: String) {
        scope.launch {
            try {
                ApiClient.post<RegisterAck>(
                    path = "/api/push/register",
                    body = RegisterRequest(platform = "android", deviceToken = token),
                )
                prefs().edit().putString(KEY_REGISTERED_TOKEN, token).apply()
                _registeredToken.value = token
            } catch (_: Throwable) {
                // 백엔드 미설정/네트워크 실패는 silent fail. 다음 refresh 시도에서 복구.
            }
        }
    }

    /** 로그아웃 시 호출. */
    fun unregister() {
        val token = _registeredToken.value ?: return
        scope.launch {
            try {
                ApiClient.post<RegisterAck>(
                    path = "/api/push/unregister",
                    body = UnregisterRequest(deviceToken = token),
                )
            } catch (_: Throwable) {
                // soft fail.
            }
            prefs().edit().remove(KEY_REGISTERED_TOKEN).apply()
            _registeredToken.value = null
        }
    }

    private suspend fun fetchToken(): String =
        suspendCancellableCoroutine { cont ->
            FirebaseMessaging.getInstance().token
                .addOnSuccessListener { cont.resume(it) }
                .addOnFailureListener { cont.resumeWithException(it) }
                .addOnCanceledListener { cont.cancel() }
        }
}

@Serializable
internal data class RegisterRequest(
    val platform: String,
    val deviceToken: String,
)

@Serializable
internal data class UnregisterRequest(val deviceToken: String)

@Serializable
internal data class RegisterAck(val ok: Boolean = true)
