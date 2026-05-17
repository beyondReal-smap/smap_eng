package site.smap.harubook.core.auth

import android.content.Context
import android.content.SharedPreferences
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey

/**
 * iOS `KeychainStore.swift` 등가물. EncryptedSharedPreferences로 액세스 토큰을 보관.
 *
 * 키:
 *  - access_token (String)
 *  - expires_at_unix (Long, epoch seconds)
 */
internal class SecurePrefs(context: Context) {

    private val prefs: SharedPreferences = run {
        val masterKey = MasterKey.Builder(context)
            .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
            .build()
        EncryptedSharedPreferences.create(
            context,
            FILE,
            masterKey,
            EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
            EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM,
        )
    }

    var accessToken: String?
        get() = prefs.getString(KEY_ACCESS_TOKEN, null)
        set(value) {
            prefs.edit().apply {
                if (value == null) remove(KEY_ACCESS_TOKEN) else putString(KEY_ACCESS_TOKEN, value)
                apply()
            }
        }

    var expiresAtUnix: Long?
        get() = prefs.getLong(KEY_EXPIRES_AT_UNIX, 0L).takeIf { it > 0 }
        set(value) {
            prefs.edit().apply {
                if (value == null) remove(KEY_EXPIRES_AT_UNIX) else putLong(KEY_EXPIRES_AT_UNIX, value)
                apply()
            }
        }

    fun clear() {
        prefs.edit().clear().apply()
    }

    private companion object {
        const val FILE = "harubook_auth"
        const val KEY_ACCESS_TOKEN = "access_token"
        const val KEY_EXPIRES_AT_UNIX = "expires_at_unix"
    }
}
