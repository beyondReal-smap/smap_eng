package site.smap.harubook

import android.app.Application
import site.smap.harubook.core.audio.AudioPlayer
import site.smap.harubook.core.auth.AuthState
import site.smap.harubook.core.billing.BillingManager
import site.smap.harubook.core.parentalpin.ParentalPinStore
import site.smap.harubook.core.push.DailyVocabReminder
import site.smap.harubook.core.push.PushManager

/**
 * Application 진입점. Process 부팅 시 토큰/PIN/알람 매니저에 ApplicationContext 주입.
 */
class HaruBookApp : Application() {
    override fun onCreate() {
        super.onCreate()
        AuthState.init(applicationContext)
        AudioPlayer.init(applicationContext)
        ParentalPinStore.init(applicationContext)
        DailyVocabReminder.init(applicationContext)
        PushManager.init(applicationContext)
        BillingManager.init(applicationContext)
    }
}
