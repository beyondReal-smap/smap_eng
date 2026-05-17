package site.smap.harubook.core.push

import android.annotation.SuppressLint
import android.app.AlarmManager
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat
import java.util.Calendar
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import site.smap.harubook.R

/**
 * iOS DailyVocabReminder 패리티. 매일 같은 시각 로컬 알림 1회.
 * AlarmManager + BroadcastReceiver — 발송 후 Receiver 가 다음날로 재등록(반복 트리거 없음).
 */
@SuppressLint("StaticFieldLeak")
object DailyVocabReminder {
    const val CHANNEL_ID = "vocab_daily"
    private const val ALARM_REQUEST = 6_001
    private const val PREFS_FILE = "harubook_daily_vocab"
    private const val KEY_ENABLED = "enabled"
    private const val KEY_HOUR = "hour"
    private const val KEY_MINUTE = "minute"
    const val DEFAULT_HOUR = 16
    const val DEFAULT_MINUTE = 0

    private lateinit var appContext: Context

    data class State(val enabled: Boolean, val hour: Int, val minute: Int)

    private val _state = MutableStateFlow(State(false, DEFAULT_HOUR, DEFAULT_MINUTE))
    val state: StateFlow<State> = _state.asStateFlow()

    fun init(context: Context) {
        if (::appContext.isInitialized) return
        appContext = context.applicationContext
        ensureChannel()
        val prefs = prefs()
        _state.value = State(
            enabled = prefs.getBoolean(KEY_ENABLED, false),
            hour = prefs.getInt(KEY_HOUR, DEFAULT_HOUR),
            minute = prefs.getInt(KEY_MINUTE, DEFAULT_MINUTE),
        )
    }

    private fun prefs() = appContext.getSharedPreferences(PREFS_FILE, Context.MODE_PRIVATE)

    fun setEnabled(enabled: Boolean) {
        prefs().edit().putBoolean(KEY_ENABLED, enabled).apply()
        _state.value = _state.value.copy(enabled = enabled)
        if (enabled) schedule() else cancel()
    }

    fun setTime(hour: Int, minute: Int) {
        prefs().edit().putInt(KEY_HOUR, hour).putInt(KEY_MINUTE, minute).apply()
        _state.value = _state.value.copy(hour = hour, minute = minute)
        if (_state.value.enabled) schedule()
    }

    fun schedule() {
        val alarm = ContextCompat.getSystemService(appContext, AlarmManager::class.java) ?: return
        val triggerAt = nextTriggerMillis(_state.value.hour, _state.value.minute)
        val pi = pendingIntent(appContext)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && !alarm.canScheduleExactAlarms()) {
            alarm.set(AlarmManager.RTC_WAKEUP, triggerAt, pi)
        } else {
            alarm.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAt, pi)
        }
    }

    fun cancel() {
        val alarm = ContextCompat.getSystemService(appContext, AlarmManager::class.java) ?: return
        alarm.cancel(pendingIntent(appContext))
    }

    private fun pendingIntent(context: Context): PendingIntent {
        val intent = Intent(context, DailyVocabReminderReceiver::class.java)
        val flags = PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        return PendingIntent.getBroadcast(context, ALARM_REQUEST, intent, flags)
    }

    private fun nextTriggerMillis(hour: Int, minute: Int): Long {
        val cal = Calendar.getInstance().apply {
            set(Calendar.HOUR_OF_DAY, hour)
            set(Calendar.MINUTE, minute)
            set(Calendar.SECOND, 0)
            set(Calendar.MILLISECOND, 0)
        }
        if (cal.timeInMillis <= System.currentTimeMillis()) cal.add(Calendar.DAY_OF_MONTH, 1)
        return cal.timeInMillis
    }

    private fun ensureChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        val nm = ContextCompat.getSystemService(appContext, NotificationManager::class.java) ?: return
        if (nm.getNotificationChannel(CHANNEL_ID) != null) return
        nm.createNotificationChannel(
            NotificationChannel(CHANNEL_ID, "단어 복습 알림", NotificationManager.IMPORTANCE_DEFAULT),
        )
    }

    internal fun showNotification() {
        ensureChannel()
        val notification = NotificationCompat.Builder(appContext, CHANNEL_ID)
            .setSmallIcon(R.drawable.login_icon)
            .setContentTitle("단어 복습 시간이에요")
            .setContentText("오늘 학습할 단어가 기다리고 있어요.")
            .setAutoCancel(true)
            .build()
        val nm = ContextCompat.getSystemService(appContext, NotificationManager::class.java) ?: return
        nm.notify(ALARM_REQUEST, notification)
    }
}
