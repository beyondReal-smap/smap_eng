package site.smap.harubook.core.auth

import android.content.Context
import android.content.SharedPreferences
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey

/**
 * AES-256 GCM + AndroidKeyStore 마스터키로 보호되는 SharedPreferences 래퍼.
 *
 * 토큰처럼 민감한 값만 보관한다.
 */
class SecurePrefs(context: Context) {

    private val prefs: SharedPreferences = run {
        val masterKey = MasterKey.Builder(context.applicationContext)
            .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
            .build()

        EncryptedSharedPreferences.create(
            context.applicationContext,
            FILE_NAME,
            masterKey,
            EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
            EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
        )
    }

    var accessToken: String?
        get() = prefs.getString(KEY_ACCESS, null)
        set(value) = prefs.edit().run {
            if (value == null) remove(KEY_ACCESS) else putString(KEY_ACCESS, value)
            apply()
        }

    /** Unix epoch seconds. */
    var expiresAtUnix: Long?
        get() = prefs.getLong(KEY_EXPIRES_AT, 0L).takeIf { it > 0 }
        set(value) = prefs.edit().run {
            if (value == null) remove(KEY_EXPIRES_AT) else putLong(KEY_EXPIRES_AT, value)
            apply()
        }

    fun clear() {
        prefs.edit().clear().apply()
    }

    companion object {
        private const val FILE_NAME = "harubook_secure_prefs"
        private const val KEY_ACCESS = "access_token"
        private const val KEY_EXPIRES_AT = "access_token_expires_at"
    }
}
