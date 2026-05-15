import Foundation
import Observation
import UIKit
import UserNotifications

/// APNs 권한 요청 + device token 등록 + 해제.
///
/// 권한 요청 시점은 화면 단(예: 첫 책 생성 완료 직후 / 설정의 옵트인 토글)에서 제어한다.
/// 시스템 정책: iOS 권한 다이얼로그는 한 번 거절되면 두 번 다시 자동으로 뜨지 않는다 —
/// 토글에서 명확한 안내 후 사용자 액션을 유도한다.
///
/// device token 등록은 백엔드 `/api/push/register`로 보내고, 사용자 토큰 만료/로그아웃 시
/// `/api/push/unregister`로 해제한다.
@Observable
@MainActor
final class PushManager {
    static let shared = PushManager()

    /// 시스템 권한 상태. 비동기로 갱신.
    private(set) var authorizationStatus: UNAuthorizationStatus = .notDetermined
    /// 마지막으로 백엔드 등록에 성공한 device token (hex).
    @ObservationIgnored private(set) var registeredToken: String?

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

    /// `AppDelegate`가 device token을 받으면 호출 — hex 변환 후 백엔드 등록.
    func applyDeviceToken(_ rawToken: Data) async {
        let hex = rawToken.map { String(format: "%02x", $0) }.joined()
        registeredToken = hex
        do {
            _ = try await APIClient.shared.send(
                Endpoint<EmptyResponse>(
                    path: "/api/push/register",
                    method: .post,
                    body: RegisterRequest(deviceToken: hex, environment: environment),
                    requiresAuth: true,
                ),
            )
        } catch {
            // 등록 실패 시에도 사용자 흐름은 막지 않는다. 다음 앱 시작 시 다시 호출됨.
            print("[push] register failed: \(error)")
        }
    }

    /// 로그아웃 시 호출.
    func unregister() async {
        guard let hex = registeredToken else { return }
        do {
            _ = try await APIClient.shared.send(
                Endpoint<EmptyResponse>(
                    path: "/api/push/unregister",
                    method: .post,
                    body: UnregisterRequest(deviceToken: hex),
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
    let deviceToken: String
    let environment: String
}

private struct UnregisterRequest: Encodable {
    let deviceToken: String
}
