package site.smap.harubook

import android.app.Application
import site.smap.harubook.core.audio.AudioPlayer
import site.smap.harubook.core.auth.AuthState

/**
 * Application 진입점. Process 부팅 시 토큰/PIN/알람 매니저에 ApplicationContext 주입.
 */
class HaruBookApp : Application() {
    override fun onCreate() {
        super.onCreate()
        AuthState.init(applicationContext)
        AudioPlayer.init(applicationContext)
    }
}
