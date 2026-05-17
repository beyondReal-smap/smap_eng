import FirebaseMessaging
import Foundation
import Observation
import UIKit
import UserNotifications

/// 권한 요청 + FCM registration token 등록 + 해제.
///
/// FCM(Firebase Cloud Messaging)으로 통합되며 흐름이 한 단계 늘었다:
///   1) `requestAuthorization`으로 사용자 권한 획득
///   2) iOS가 APNs device token을 발급해 `applyDeviceToken`에 전달
///   3) APNs token을 `Messaging.apnsToken`에 주입 → Firebase가 FCM token으로 교환
///   4) `Messaging.token()`으로 받은 FCM registration token을 백엔드 `/api/push/register`에 전송
///
/// 권한 다이얼로그는 한 번 거절되면 두 번 다시 자동으로 뜨지 않는다 — 토글에서 명확한 안내 후
/// 사용자 액션을 유도한다. 로그아웃 시 `/api/push/unregister`로 해제.
@Observable
@MainActor
final class PushManager {
    static let shared = PushManager()

    /// 시스템 권한 상태. 비동기로 갱신.
    private(set) var authorizationStatus: UNAuthorizationStatus = .notDetermined
    /// 마지막으로 백엔드 등록에 성공한 FCM registration token.
    @ObservationIgnored private(set) var registeredToken: String?

    /// FCM 통합 후 environment는 백엔드에서 의미를 잃었지만(FCM이 sandbox/prod 자동 처리),
    /// 호환성을 위해 register 요청 본문에 그대로 전송.
    private let environment: String = {
        #if DEBUG
        return "sandbox"
        #else
        return "production"
        #endif
    }()

    init() {}

    /// 앱 시작 시 호출 — 현재 권한 상태를 읽어 둔다.
    func refreshAuthorizationStatus() async {
        let settings = await UNUserNotificationCenter.current().notificationSettings()
        self.authorizationStatus = settings.authorizationStatus
    }

    /// 시스템 다이얼로그로 권한 요청. 허용되면 `registerForRemoteNotifications`까지 트리거.
    /// 이미 결정된 상태(.denied / .authorized)면 그대로 반환.
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

    /// `AppDelegate`가 APNs device token을 받으면 호출.
    /// APNs token을 Firebase에 주입한 뒤 FCM registration token을 받아 백엔드에 등록한다.
    func applyDeviceToken(_ rawToken: Data) async {
        // Firebase에 APNs token 주입 — 이후 Messaging.token()이 FCM token을 발급한다.
        Messaging.messaging().apnsToken = rawToken

        // FCM token은 비동기 발급. 첫 호출 시 ~1s, 캐시되면 즉시 반환.
        let fcmToken: String
        do {
            fcmToken = try await Messaging.messaging().token()
        } catch {
            print("[push] FCM token fetch failed: \(error)")
            return
        }
        registeredToken = fcmToken

        do {
            _ = try await APIClient.shared.send(
                Endpoint<EmptyResponse>(
                    path: "/api/push/register",
                    method: .post,
                    body: RegisterRequest(
                        deviceToken: fcmToken,
                        platform: "ios",
                        environment: environment,
                    ),
                    requiresAuth: true,
                ),
            )
        } catch {
            // 등록 실패 시에도 사용자 흐름은 막지 않는다. 다음 앱 시작 시 다시 호출됨.
            print("[push] register failed: \(error)")
        }
    }

    /// Firebase가 새 FCM token을 발급할 때(예: 앱 재설치 후 첫 실행) 호출 — backend 동기화 유지.
    func applyFcmTokenRefresh(_ fcmToken: String) async {
        // APNs token 없이 단독 갱신될 수도 있다(시뮬레이터, 첫 부팅 등). 그때도 백엔드에는
        // 항상 최신 FCM token만 보내면 된다 — apns token은 Firebase 내부에서 보관.
        registeredToken = fcmToken
        do {
            _ = try await APIClient.shared.send(
                Endpoint<EmptyResponse>(
                    path: "/api/push/register",
                    method: .post,
                    body: RegisterRequest(
                        deviceToken: fcmToken,
                        platform: "ios",
                        environment: environment,
                    ),
                    requiresAuth: true,
                ),
            )
        } catch {
            print("[push] fcm refresh register failed: \(error)")
        }
    }

    /// 로그아웃 시 호출.
    func unregister() async {
        guard let fcmToken = registeredToken else { return }
        do {
            _ = try await APIClient.shared.send(
                Endpoint<EmptyResponse>(
                    path: "/api/push/unregister",
                    method: .post,
                    body: UnregisterRequest(deviceToken: fcmToken),
                    requiresAuth: true,
                ),
            )
        } catch {
            print("[push] unregister failed: \(error)")
        }
        registeredToken = nil
        // Firebase 내부 캐시도 비워둔다 — 다음 로그인 시 새 token으로 register.
        try? await Messaging.messaging().deleteToken()
    }
}

private struct RegisterRequest: Encodable {
    let deviceToken: String
    let platform: String
    let environment: String
}

private struct UnregisterRequest: Encodable {
    let deviceToken: String
}
