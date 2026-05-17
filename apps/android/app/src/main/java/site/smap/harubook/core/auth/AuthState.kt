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
            // 콜드 스타트 시 last_seen_at 갱신 + 새 FCM 토큰이면 자동 재등록.
            runCatching { site.smap.harubook.core.push.PushManager.refresh() }
        } else {
            if (token != null) runCatching { prefs.clear() }
            _phase.value = Phase.SignedOut
        }
    }

    fun peekAccessToken(): String? =
        if (::prefs.isInitialized) runCatching { prefs.accessToken }.getOrNull() else null

    fun signOut() {
        runCatching { prefs.clear() }
        // FCM 토큰을 서버에서 해제 — 푸시 발송 대상에서 제외. 비동기 fire-and-forget.
        runCatching { site.smap.harubook.core.push.PushManager.unregister() }
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
        // 로그인 직후 FCM 토큰을 서버에 등록 — 백그라운드/실패는 soft fail.
        runCatching { site.smap.harubook.core.push.PushManager.refresh() }
    }

    /** 이메일+비밀번호 로그인. 실패 시 [lastError] 채움, false 반환. */
    suspend fun signInWithEmail(email: String, password: String): Boolean {
        return try {
            val response: MobileExchangeResponse = ApiClient.post(
                path = "/api/auth/mobile/password",
                body = PasswordRequest(email = email, password = password),
                requiresAuth = false,
            )
            applyExchange(response)
            true
        } catch (e: site.smap.harubook.core.networking.ApiError.Http) {
            lastError = "이메일 또는 비밀번호가 올바르지 않습니다."
            false
        } catch (e: kotlinx.coroutines.CancellationException) {
            throw e
        } catch (e: Throwable) {
            lastError = "로그인 실패: ${e.message ?: e::class.java.simpleName}"
            false
        }
    }

    sealed class SignupOutcome {
        data object Success : SignupOutcome()
        data object DuplicateEmail : SignupOutcome()
        data class Failure(val message: String) : SignupOutcome()
    }

    /** 이메일 회원가입. 서버가 가입+기본 프로필+토큰을 즉시 발급한다. */
    suspend fun signUp(
        childName: String,
        email: String,
        password: String,
        agreeAge: Boolean,
        agreeTerms: Boolean,
        agreePrivacy: Boolean,
    ): SignupOutcome {
        return try {
            val response: MobileExchangeResponse = ApiClient.post(
                path = "/api/auth/mobile/signup",
                body = SignupRequest(
                    childName = childName,
                    email = email,
                    password = password,
                    agreeAge = agreeAge,
                    agreeTerms = agreeTerms,
                    agreePrivacy = agreePrivacy,
                ),
                requiresAuth = false,
            )
            applyExchange(response)
            SignupOutcome.Success
        } catch (e: site.smap.harubook.core.networking.ApiError.Http) {
            if (e.status == 409 || e.code == "duplicate_email") {
                SignupOutcome.DuplicateEmail
            } else {
                val msg = "가입에 실패했어요. 입력값을 확인해 주세요."
                lastError = msg
                SignupOutcome.Failure(msg)
            }
        } catch (e: kotlinx.coroutines.CancellationException) {
            throw e
        } catch (e: Throwable) {
            val msg = "가입 실패: ${e.message ?: e::class.java.simpleName}"
            lastError = msg
            SignupOutcome.Failure(msg)
        }
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

@Serializable
internal data class PasswordRequest(
    val email: String,
    val password: String,
)

@Serializable
internal data class SignupRequest(
    val childName: String,
    val email: String,
    val password: String,
    val agreeAge: Boolean,
    val agreeTerms: Boolean,
    val agreePrivacy: Boolean,
)
