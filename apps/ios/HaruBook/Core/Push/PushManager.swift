import Foundation
import Observation
import UIKit
import UserNotifications

/// FCM 토큰 수명주기 + 백엔드 등록/해제.
///
/// 흐름:
///   - 권한 요청: `requestAuthorization()` → APNs registerForRemoteNotifications
///   - APNs token: `AppDelegate.didRegisterForRemoteNotificationsWithDeviceToken`
///       → Messaging.apnsToken (FirebaseMessaging 이 페어링)
///   - FCM token: `MessagingDelegate.messaging(_:didReceiveRegistrationToken:)`
///       → `PushManager.applyFcmToken` → POST /api/push/register
///   - 로그아웃: `unregister()` → POST /api/push/unregister
///
/// 백엔드는 platform 별 분기 없이 FCM 으로 발송 — APNs 직접 통신은 폐기. environment 필드는
/// production 으로 통일(FCM 은 디버그/프로덕션 키 분기 없음).
@Observable
@MainActor
final class PushManager {
    static let shared = PushManager()

    private(set) var authorizationStatus: UNAuthorizationStatus = .notDetermined
    /// 마지막으로 백엔드 등록에 성공한 FCM registration token.
    @ObservationIgnored private(set) var registeredToken: String?

    init() {}

    func refreshAuthorizationStatus() async {
        let settings = await UNUserNotificationCenter.current().notificationSettings()
        self.authorizationStatus = settings.authorizationStatus
    }

    /// 시스템 다이얼로그로 권한 요청. 허용되면 APNs registerForRemoteNotifications 까지 트리거.
    @discardableResult
    func requestAuthorization() async -> UNAuthorizationStatus {
        let center = UNUserNotificationCenter.current()
        let current = await center.notificationSettings()
        if current.authorizationStatus == .notDetermined {
            _ = try? await center.requestAuthorization(options: [.alert, .badge, .sound])
        }
        let updated = await center.notificationSettings()
        self.authorizationStatus = updated.authorizationStatus
        if updated.authorizationStatus == .authorized {
            UIApplication.shared.registerForRemoteNotifications()
        }
        return updated.authorizationStatus
    }

    /// FCM 이 발급한 토큰을 백엔드에 등록.
    /// `MessagingDelegate.didReceiveRegistrationToken` 콜백에서 호출된다.
    func applyFcmToken(_ token: String) async {
        registeredToken = token
        do {
            _ = try await APIClient.shared.send(
                Endpoint<EmptyResponse>(
                    path: "/api/push/register",
                    method: .post,
                    body: RegisterRequest(
                        platform: "ios",
                        deviceToken: token,
                        environment: "production",
                    ),
                    requiresAuth: true,
                ),
            )
        } catch {
            // 등록 실패는 사용자 흐름 차단 없음 — 다음 앱 시작 시 토큰 재발급되며 자동 재시도.
            print("[push] register failed: \(error)")
        }
    }

    /// 로그아웃 시 호출 — 토큰을 서버에서 제거.
    func unregister() async {
        guard let token = registeredToken else { return }
        do {
            _ = try await APIClient.shared.send(
                Endpoint<EmptyResponse>(
                    path: "/api/push/unregister",
                    method: .post,
                    body: UnregisterRequest(deviceToken: token),
                    requiresAuth: true,
                ),
            )
        } catch {
            print("[push] unregister failed: \(error)")
        }
        registeredToken = nil
    }
}

private struct RegisterRequest: Encodable {
    let platform: String
    let deviceToken: String
    let environment: String
}

private struct UnregisterRequest: Encodable {
    let deviceToken: String
}
