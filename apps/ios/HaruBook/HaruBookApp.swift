import SwiftUI
import UIKit

@main
struct HaruBookApp: App {
    @UIApplicationDelegateAdaptor(HaruBookAppDelegate.self) private var appDelegate
    @State private var authState = AuthState()

    var body: some Scene {
        WindowGroup {
            RootView()
                .environment(authState)
                .preferredColorScheme(.light)
                .tint(.smapPrimary)
                .task { await PushManager.shared.refreshAuthorizationStatus() }
        }
    }
}

/// APNs device token 수신을 위해 UIKit AppDelegate를 SwiftUI App에 연결.
final class HaruBookAppDelegate: NSObject, UIApplicationDelegate {
    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil,
    ) -> Bool {
        true
    }

    func application(
        _ application: UIApplication,
        didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data,
    ) {
        Task { @MainActor in
            await PushManager.shared.applyDeviceToken(deviceToken)
        }
    }

    func application(
        _ application: UIApplication,
        didFailToRegisterForRemoteNotificationsWithError error: Error,
    ) {
        // 권한이 거절된 경우에도 호출됨 — 사용자 흐름 차단 없음.
        print("[push] register failed: \(error.localizedDescription)")
    }
}

struct RootView: View {
    @Environment(AuthState.self) private var auth

    var body: some View {
        switch auth.phase {
        case .loading:
            SplashView()
                .task { await auth.bootstrap() }
        case .signedOut:
            LoginView()
        case .signedIn:
            HomeRouter()
        }
    }
}

private struct SplashView: View {
    var body: some View {
        ZStack {
            Color.smapBackground.ignoresSafeArea()
            VStack(spacing: 16) {
                ProgressView()
                Text("하루책")
                    .font(.smapTitle)
                    .foregroundStyle(Color.smapText)
            }
        }
    }
}
