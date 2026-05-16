import Foundation
import Observation
import UserNotifications

/// 단어 복습 일일 로컬 알림.
///
/// 매일 사용자가 설정한 시간(기본 16:00)에 같은 알림을 반복 발송. 알림 본문은 동적으로 갱신할 수 없어
/// 정적 메시지를 사용한다 — 단말 sched이라 서버/네트워크 없이 동작.
///
/// 상태:
///   - enabled: 사용자가 켰는지 (`UserDefaults`)
///   - hour/minute: 알림 시각 (`UserDefaults`)
///   - 권한이 없으면 schedule 호출은 무시됨 — 호출자가 PushManager 권한 흐름과 연동
///
/// 식별자는 단일 — 같은 ID로 재등록하면 이전 요청을 덮어쓴다.
@Observable
@MainActor
final class DailyVocabReminder {
    static let shared = DailyVocabReminder()

    private static let requestId = "site.smap.harubook.vocab.daily"

    private enum DefaultsKey {
        static let enabled = "vocab.dailyReminder.enabled"
        static let hour = "vocab.dailyReminder.hour"
        static let minute = "vocab.dailyReminder.minute"
    }

    /// 기본 시간 16:00 — 학교 끝나고 집에 도착하는 시간대.
    static let defaultHour = 16
    static let defaultMinute = 0

    var isEnabled: Bool {
        get { UserDefaults.standard.object(forKey: DefaultsKey.enabled) as? Bool ?? false }
        set {
            UserDefaults.standard.set(newValue, forKey: DefaultsKey.enabled)
            Task { await syncSchedule() }
        }
    }

    var hour: Int {
        get { UserDefaults.standard.object(forKey: DefaultsKey.hour) as? Int ?? Self.defaultHour }
        set {
            UserDefaults.standard.set(newValue, forKey: DefaultsKey.hour)
            Task { await syncSchedule() }
        }
    }

    var minute: Int {
        get { UserDefaults.standard.object(forKey: DefaultsKey.minute) as? Int ?? Self.defaultMinute }
        set {
            UserDefaults.standard.set(newValue, forKey: DefaultsKey.minute)
            Task { await syncSchedule() }
        }
    }

    /// 현재 설정에 맞춰 OS에 알림을 등록하거나 제거한다.
    /// 권한이 없으면 등록 시도는 silently 무시 — 사용자가 권한을 켤 때 호출자가 다시 sync 호출 권장.
    func syncSchedule() async {
        let center = UNUserNotificationCenter.current()

        // 항상 기존 등록을 먼저 제거 — 시간 변경 시 깔끔하게 재등록.
        center.removePendingNotificationRequests(withIdentifiers: [Self.requestId])

        guard isEnabled else { return }

        let settings = await center.notificationSettings()
        guard settings.authorizationStatus == .authorized
            || settings.authorizationStatus == .provisional else {
            return
        }

        let content = UNMutableNotificationContent()
        content.title = "단어 복습 시간이에요"
        content.body = "오늘 학습할 단어가 기다리고 있어요."
        content.sound = .default

        var date = DateComponents()
        date.hour = hour
        date.minute = minute
        let trigger = UNCalendarNotificationTrigger(dateMatching: date, repeats: true)

        let request = UNNotificationRequest(
            identifier: Self.requestId,
            content: content,
            trigger: trigger,
        )

        do {
            try await center.add(request)
        } catch {
            // 등록 실패는 사용자 흐름을 막지 않는다 — 다음 sync 시도에서 복구.
        }
    }
}
