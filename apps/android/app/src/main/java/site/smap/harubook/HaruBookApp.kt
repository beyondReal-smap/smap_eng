package site.smap.harubook

import android.app.Application
import site.smap.harubook.core.auth.AuthState

/**
 * Application 진입점.
 *
 * Process 부팅 시 [AuthState]가 EncryptedSharedPreferences에서 토큰을 복구할 수 있도록
 * Application context를 주입한다.
 */
class HaruBookApp : Application() {
    override fun onCreate() {
        super.onCreate()
        AuthState.init(applicationContext)
    }
}
