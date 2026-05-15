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
    @State private var splashFinished = false

    /// SplashView 최소 노출 시간 — Keychain bootstrap이 거의 즉시 끝나면 깜빡임이
    /// 일어나 사용자가 스플래시를 인지 못 한다. 페이드아웃 0.35s 와 합쳐 ~1.55s 노출.
    private static let minimumSplashSeconds: Double = 1.2

    var body: some View {
        ZStack {
            content
                .opacity(splashFinished ? 1 : 0)

            if !splashFinished {
                SplashView()
                    .transition(.opacity)
                    .zIndex(1)
            }
        }
        .task {
            // bootstrap과 최소 노출 시간을 동시에 진행. 둘 다 끝나야 스플래시 종료.
            async let bootstrap: Void = runBootstrapIfNeeded()
            async let delay: Void = sleep(seconds: Self.minimumSplashSeconds)
            _ = await (bootstrap, delay)
            withAnimation(.easeOut(duration: 0.35)) {
                splashFinished = true
            }
        }
    }

    @ViewBuilder
    private var content: some View {
        switch auth.phase {
        case .loading:
            // bootstrap이 끝나기 전엔 어차피 SplashView가 가리지만,
            // splashFinished가 true가 될 때 phase가 .loading이면 잠시 빈 화면 → 곧 갱신.
            Color.clear
        case .signedOut:
            LoginView()
        case .signedIn:
            HomeRouter()
        }
    }

    private func runBootstrapIfNeeded() async {
        if auth.phase == .loading {
            await auth.bootstrap()
        }
    }

    private func sleep(seconds: Double) async {
        try? await Task.sleep(nanoseconds: UInt64(seconds * 1_000_000_000))
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
                    // LoginView 와 동일한 손글씨 폰트 A2Z로 통일.
                    Text("하루책")
                        .font(Font.atozBlack(34))
                        .foregroundStyle(Self.charcoal)
                    Text("매일 한 권, 우리 아이의 영어 동화책")
                        .font(Font.atozRegular(14))
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
