package site.smap.harubook.core.auth

import android.annotation.SuppressLint
import android.content.Context
import android.net.Uri
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import site.smap.harubook.core.networking.ApiClient
import site.smap.harubook.core.networking.AppConfig

/**
 * iOS `AuthState.swift` 등가물. 토큰 수명주기 + OAuth 흐름 + 인증 상태의 단일 진입점.
 *
 * - Application onCreate에서 [init]으로 ApplicationContext 주입.
 * - [phase]는 SwiftUI `@Observable` 대응 — Compose collectAsState.
 */
@SuppressLint("StaticFieldLeak")
object AuthState {

    enum class Phase { Loading, SignedOut, SignedIn }

    private val _phase = MutableStateFlow(Phase.Loading)
    val phase: StateFlow<Phase> = _phase.asStateFlow()

    @Volatile
    var lastError: String? = null
        private set

    private lateinit var prefs: SecurePrefs

    fun init(context: Context) {
        if (::prefs.isInitialized) return
        prefs = SecurePrefs(context.applicationContext)
    }

    /** Storage에서 토큰 복구. 만료 시 SignedOut으로 전이. */
    suspend fun refreshFromStorage() {
        if (_phase.value == Phase.SignedIn) return

        val token = runCatching { prefs.accessToken }.getOrNull()
        val expiresAt = runCatching { prefs.expiresAtUnix }.getOrNull()
        val nowSec = System.currentTimeMillis() / 1000

        if (!token.isNullOrEmpty() && expiresAt != null && expiresAt > nowSec) {
            _phase.value = Phase.SignedIn
        } else {
            if (token != null) runCatching { prefs.clear() }
            _phase.value = Phase.SignedOut
        }
    }

    fun peekAccessToken(): String? =
        if (::prefs.isInitialized) runCatching { prefs.accessToken }.getOrNull() else null

    fun signOut() {
        runCatching { prefs.clear() }
        _phase.value = Phase.SignedOut
    }

    fun handleUnauthorized() {
        signOut()
        lastError = "로그인이 만료되었습니다. 다시 로그인해 주세요."
    }

    /** Custom Tabs OAuth 시작 → exchange API → 토큰 저장. */
    suspend fun signIn(context: Context, provider: String): Boolean {
        return try {
            val verifier = PKCE.generateVerifier()
            val challenge = PKCE.challenge(verifier)

            val startUrl = buildStartUrl(provider, challenge)
            val callback = OAuthCoordinator.launchAndAwait(context, startUrl)

            val code = callback.getQueryParameter("code")
                ?: error("콜백에서 인증 코드를 찾을 수 없습니다.")

            val response: MobileExchangeResponse = ApiClient.post(
                path = "/api/auth/mobile/exchange",
                body = ExchangeRequest(code = code, codeVerifier = verifier),
                requiresAuth = false,
            )
            applyExchange(response)
            true
        } catch (e: kotlinx.coroutines.CancellationException) {
            lastError = null
            throw e
        } catch (e: Throwable) {
            lastError = "로그인 실패: ${e.message ?: e::class.java.simpleName}"
            false
        }
    }

    private fun applyExchange(response: MobileExchangeResponse) {
        prefs.accessToken = response.accessToken
        prefs.expiresAtUnix = response.expiresAtUnix
        lastError = null
        _phase.value = Phase.SignedIn
    }

    private fun buildStartUrl(provider: String, challenge: String): Uri =
        Uri.parse("${AppConfig.API_BASE_URL}/api/auth/mobile/start").buildUpon()
            .appendQueryParameter("provider", provider)
            .appendQueryParameter("redirect", AppConfig.authCallbackUrl)
            .appendQueryParameter("code_challenge", challenge)
            .appendQueryParameter("code_challenge_method", "S256")
            .build()
}

@Serializable
internal data class ExchangeRequest(
    val code: String,
    @SerialName("code_verifier")
    val codeVerifier: String,
)

@Serializable
data class MobileExchangeResponse(
    val accessToken: String,
    val expiresAtUnix: Long,
    val issuedAtUnix: Long? = null,
)
