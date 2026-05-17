package site.smap.harubook.core.push

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/**
 * 발송 후 다음날 같은 시각으로 재등록(AlarmManager 에 calendar repeat 트리거 없음).
 */
class DailyVocabReminderReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent?) {
        DailyVocabReminder.init(context.applicationContext)
        if (!DailyVocabReminder.state.value.enabled) return
        DailyVocabReminder.showNotification()
        DailyVocabReminder.schedule()
    }
}

/** 기기 부팅/앱 업데이트 후 알람 재등록. */
class BootRescheduleReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent?) {
        DailyVocabReminder.init(context.applicationContext)
        if (DailyVocabReminder.state.value.enabled) DailyVocabReminder.schedule()
    }
}
