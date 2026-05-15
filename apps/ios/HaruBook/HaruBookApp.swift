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

/// 스플래시. 웹 메인 화면의 배색을 그대로 이식한다:
///   - Warm Canvas(#FBFAF9) 베이스
///   - 좌상 따뜻한 노랑 / 우상 파우더 스카이 / 하단 코랄 — 세 개의 라디얼 글로우
///   - Charcoal(#343433) 타이포 + 코랄 Primary 액센트
/// 시스템 launch screen(`LaunchBackground` = #FBFAF9)에서 SwiftUI로 매끄럽게 이어진다.
private struct SplashView: View {
    @State private var appeared = false

    // 웹 globals.css 의 body 라디얼 그라디언트와 동일한 톤(근사 sRGB).
    private static let canvas = Color(hex: 0xFBFAF9)
    private static let glowYellow = Color(hex: 0xF5E5C2)
    private static let glowSky = Color(hex: 0xC2D9F5)
    private static let glowCoral = Color(hex: 0xF5D0C2)
    private static let charcoal = Color(hex: 0x343433)
    private static let graphite = Color(hex: 0x474645)
    private static let coral = Color(hex: 0xFFB39A) // Soft Coral Peach — primary

    var body: some View {
        ZStack {
            Self.canvas.ignoresSafeArea()

            GeometryReader { geo in
                let maxDim = max(geo.size.width, geo.size.height)
                ZStack {
                    radialGlow(
                        Self.glowYellow.opacity(0.45),
                        center: UnitPoint(x: 0.15, y: 0.10),
                        radius: maxDim * 0.85,
                    )
                    radialGlow(
                        Self.glowSky.opacity(0.35),
                        center: UnitPoint(x: 0.88, y: 0.14),
                        radius: maxDim * 0.78,
                    )
                    radialGlow(
                        Self.glowCoral.opacity(0.32),
                        center: UnitPoint(x: 0.50, y: 1.00),
                        radius: maxDim * 0.95,
                    )
                }
            }
            .ignoresSafeArea()
            .allowsHitTesting(false)

            VStack(spacing: 18) {
                Image("LoginIcon")
                    .resizable()
                    .scaledToFit()
                    .frame(width: 72, height: 72)
                    .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
                    .shadow(color: Self.charcoal.opacity(0.08), radius: 12, x: 0, y: 6)
                    .accessibilityHidden(true)

                VStack(spacing: 6) {
                    Text("하루책")
                        .font(.system(size: 30, weight: .heavy, design: .rounded))
                        .foregroundStyle(Self.charcoal)
                    Text("매일 한 권, 우리 아이의 영어 동화책")
                        .font(.system(size: 14, weight: .regular))
                        .foregroundStyle(Self.graphite)
                        .multilineTextAlignment(.center)
                }
                .opacity(appeared ? 1 : 0)
                .offset(y: appeared ? 0 : 8)

                ProgressView()
                    .tint(Self.coral)
                    .opacity(appeared ? 1 : 0)
                    .padding(.top, 8)
            }
            .padding(.horizontal, 24)
        }
        .onAppear {
            withAnimation(.easeOut(duration: 0.45).delay(0.05)) {
                appeared = true
            }
        }
    }

    private func radialGlow(_ color: Color, center: UnitPoint, radius: CGFloat) -> some View {
        RadialGradient(
            gradient: Gradient(colors: [color, color.opacity(0)]),
            center: center,
            startRadius: 0,
            endRadius: radius,
        )
    }
}
