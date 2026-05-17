package site.smap.harubook.core.push

import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat
import android.app.NotificationManager
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import site.smap.harubook.R

/**
 * FCM 수신/토큰 갱신 핸들러.
 *
 *   - onNewToken: PushManager 에 새 토큰 등록 위임(백엔드로 POST).
 *   - onMessageReceived: 포그라운드 알림(시스템이 자동 표시하지 않으므로 NotificationCompat 으로 직접 표시).
 *
 * 백그라운드/킬 상태에서는 FCM 이 알림 본문(`notification`)을 자동으로 표시하므로 별도 처리 없음.
 */
class HarubookFirebaseMessagingService : FirebaseMessagingService() {

    override fun onNewToken(token: String) {
        super.onNewToken(token)
        PushManager.init(applicationContext)
        PushManager.register(token)
    }

    override fun onMessageReceived(message: RemoteMessage) {
        super.onMessageReceived(message)
        val notification = message.notification ?: return

        val builder = NotificationCompat.Builder(applicationContext, DailyVocabReminder.CHANNEL_ID)
            .setSmallIcon(R.drawable.login_icon)
            .setContentTitle(notification.title ?: "하루책")
            .setContentText(notification.body ?: "")
            .setAutoCancel(true)

        val nm = ContextCompat.getSystemService(applicationContext, NotificationManager::class.java) ?: return
        // 메시지 id 또는 hash 기반 notify id (음수 안전화).
        val id = message.messageId?.hashCode()?.let { it and 0x7FFFFFFF } ?: 7_001
        nm.notify(id, builder.build())
    }
}
