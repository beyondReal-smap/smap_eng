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

/// 시스템 launch screen과 동일한 배경/로고 구성으로 시작해, 부드러운 fade-in으로
/// 텍스트·진행 표시기만 덧붙인다. launch → SwiftUI 전환 시 깜빡임을 최소화한다.
private struct SplashView: View {
    @State private var appeared = false

    var body: some View {
        ZStack {
            Color.smapBackground.ignoresSafeArea()

            VStack(spacing: 20) {
                Image("LoginIcon")
                    .resizable()
                    .scaledToFit()
                    .frame(width: 132, height: 132)
                    .accessibilityHidden(true)

                VStack(spacing: 6) {
                    Text("하루책")
                        .font(.smapDisplay)
                        .foregroundStyle(Color.smapText)
                    Text("매일 한 권, 우리 아이의 영어 동화책")
                        .font(.smapBody)
                        .foregroundStyle(Color.smapMuted)
                        .multilineTextAlignment(.center)
                }
                .opacity(appeared ? 1 : 0)
                .offset(y: appeared ? 0 : 8)

                ProgressView()
                    .tint(Color.smapPrimary)
                    .opacity(appeared ? 1 : 0)
                    .padding(.top, 12)
            }
            .padding(.horizontal, 24)
        }
        .onAppear {
            withAnimation(.easeOut(duration: 0.45).delay(0.05)) {
                appeared = true
            }
        }
    }
}
