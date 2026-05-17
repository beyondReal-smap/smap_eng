package site.smap.harubook.core.parentalpin

import android.annotation.SuppressLint
import android.content.Context
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import java.security.MessageDigest

/**
 * 보호자 PIN — COPPA Level-1 "아이 실수 진입 방지" 수준. iOS ParentalPinStore 패리티.
 *
 * 저장: SharedPreferences(MODE_PRIVATE) + SHA-256 해시 + 고정 salt. 4자리 PIN 위협 모델 상
 * 디바이스 풀악세스 침해는 가정하지 않으므로 EncryptedSharedPreferences 도입 비용 미정당.
 *
 * 잠금/해제: unlock 성공 시 메모리 unlockedUntil = now + 30분. 30분 이내 재진입 자동 통과.
 */
@SuppressLint("StaticFieldLeak")
object ParentalPinStore {
    private const val PREFS_FILE = "harubook_parental_pin"
    private const val KEY_PIN_HASH = "parental_pin.hash"
    private const val SALT = "smap-eng:parental-pin:v1"
    private const val UNLOCK_TTL_MS = 30 * 60 * 1000L

    private lateinit var appContext: Context

    private val _hasPin = MutableStateFlow(false)
    val hasPin: StateFlow<Boolean> = _hasPin.asStateFlow()

    private val _unlocked = MutableStateFlow(false)
    val unlocked: StateFlow<Boolean> = _unlocked.asStateFlow()

    @Volatile
    private var unlockedUntilMs: Long? = null

    fun init(context: Context) {
        if (::appContext.isInitialized) return
        appContext = context.applicationContext
        _hasPin.value = prefs().getString(KEY_PIN_HASH, null) != null
    }

    private fun prefs() = appContext.getSharedPreferences(PREFS_FILE, Context.MODE_PRIVATE)

    fun setPin(pin: String) {
        prefs().edit().putString(KEY_PIN_HASH, hash(pin)).apply()
        _hasPin.value = true
        unlockedUntilMs = System.currentTimeMillis() + UNLOCK_TTL_MS
        _unlocked.value = true
    }

    fun unlock(pin: String): Boolean {
        val stored = prefs().getString(KEY_PIN_HASH, null) ?: return false
        if (hash(pin) != stored) return false
        unlockedUntilMs = System.currentTimeMillis() + UNLOCK_TTL_MS
        _unlocked.value = true
        return true
    }

    fun lock() {
        unlockedUntilMs = null
        _unlocked.value = false
    }

    fun reset() {
        prefs().edit().remove(KEY_PIN_HASH).apply()
        _hasPin.value = false
        unlockedUntilMs = null
        _unlocked.value = false
    }

    private fun hash(pin: String): String {
        val digest = MessageDigest.getInstance("SHA-256")
            .digest("$SALT:$pin".toByteArray(Charsets.UTF_8))
        val hex = digest.joinToString("") { "%02x".format(it) }
        return "sha256:$hex"
    }
}
