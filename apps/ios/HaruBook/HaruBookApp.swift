import SwiftUI
import UIKit

@main
struct HaruBookApp: App {
    @UIApplicationDelegateAdaptor(HaruBookAppDelegate.self) private var appDelegate
    // APIClient의 401 핸들러가 AuthState.shared.handleUnauthorized()를 호출하므로
    // 환경에 주입하는 인스턴스도 반드시 동일 singleton 이어야 한다.
    // 별도 `AuthState()` 인스턴스를 만들면 401 시 shared의 phase만 바뀌고
    // RootView가 관찰하는 environment 인스턴스는 갱신되지 않아 LoginView로 복귀 못 함.
    @State private var authState = AuthState.shared
    /// 백그라운드 → active 복귀 시점에 푸시 권한 상태를 재조회하기 위해 관찰.
    /// 사용자가 설정 앱에서 권한을 바꾼 뒤 돌아왔을 때 SettingsView 등이 최신 상태를 반영하려면 필요.
    @Environment(\.scenePhase) private var scenePhase

    init() {
        // NavigationBar 타이틀(SwiftUI Text가 아니라 UIKit NavigationBar)의 폰트도 A2Z로.
        let appearance = UINavigationBarAppearance()
        appearance.configureWithTransparentBackground()
        appearance.backgroundColor = .clear
        // trait collection이 다크로 바뀔 때 UINavigationBar가 자동으로 재해석하도록 dynamic UIColor 사용.
        // 라이트: Charcoal #343433 / 다크: Warm Off-White #E8E7E3 — Color.smapText 토큰의 UIKit 대응.
        let charcoal = UIColor { trait in
            trait.userInterfaceStyle == .dark
                ? UIColor(red: 0xE8/255, green: 0xE7/255, blue: 0xE3/255, alpha: 1)
                : UIColor(red: 0x34/255, green: 0x34/255, blue: 0x33/255, alpha: 1)
        }
        if let inlineFont = UIFont(name: "A2Z-Bold", size: 17) {
            appearance.titleTextAttributes = [.font: inlineFont, .foregroundColor: charcoal]
        }
        if let largeFont = UIFont(name: "A2Z-Black", size: 28) {
            appearance.largeTitleTextAttributes = [.font: largeFont, .foregroundColor: charcoal]
        }
        UINavigationBar.appearance().standardAppearance = appearance
        UINavigationBar.appearance().scrollEdgeAppearance = appearance
        UINavigationBar.appearance().compactAppearance = appearance

        // TabBar 라벨도 동일.
        let tabAppearance = UITabBarAppearance()
        tabAppearance.configureWithDefaultBackground()
        if let tabFont = UIFont(name: "A2Z-Bold", size: 10) {
            tabAppearance.stackedLayoutAppearance.normal.titleTextAttributes = [.font: tabFont]
            tabAppearance.stackedLayoutAppearance.selected.titleTextAttributes = [.font: tabFont]
        }
        UITabBar.appearance().standardAppearance = tabAppearance
        UITabBar.appearance().scrollEdgeAppearance = tabAppearance
    }

    var body: some Scene {
        WindowGroup {
            RootView()
                .environment(authState)
                // 시스템 다크 모드 자동 추종. 모든 색은 Color+Theme.swift 토큰에서 라이트/다크
                // 쌍으로 정의 — UINavigationBarAppearance / UITabBarAppearance 도 dynamic UIColor 사용.
                // 다크 팔레트는 라이트 hue 유지 + lightness 반전 기반 보수적 안이라 디자이너 정밀
                // 검수 후 두 번째 hex 인자만 조정 권장.
                .tint(.smapPrimary)
                .task { await PushManager.shared.refreshAuthorizationStatus() }
                // 첫 진입은 위 .task가, 백그라운드 복귀는 onChange가 처리.
                // SwiftUI 첫 호출 시 onChange는 트리거되지 않으므로 중복 호출 없음.
                .onChange(of: scenePhase) { _, newPhase in
                    if newPhase == .active {
                        Task { await PushManager.shared.refreshAuthorizationStatus() }
                    }
                }
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
        // localizedDescription 은 시스템 메시지(공개 안전)로 .public 마킹.
        AppLog.push.warning("register failed: \(error.localizedDescription, privacy: .public)")
    }
}

struct RootView: View {
    @Environment(AuthState.self) private var auth
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
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
            withAnimation(reduceMotion ? nil : .easeOut(duration: 0.35)) {
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
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    // 웹 globals.css 의 body 라디얼 그라디언트와 동일한 톤(근사 sRGB).
    // 디자인 시스템 토큰과 의미가 일치하는 색은 토큰 사용 — 자동 다크 적응.
    // glow 3종은 라디얼 글로우 전용 톤이라 별도 정의 + Color(light:dark:) 로 다크 대응.
    private static let canvas = Color.smapBackground
    private static let glowYellow = Color(
        light: Color(hex: 0xF5E5C2),
        dark:  Color(hex: 0x554831),
    )
    private static let glowSky = Color(
        light: Color(hex: 0xC2D9F5),
        dark:  Color(hex: 0x3A4A5C),
    )
    private static let glowCoral = Color(
        light: Color(hex: 0xF5D0C2),
        dark:  Color(hex: 0x5C463A),
    )
    private static let charcoal = Color.smapText
    private static let graphite = Color.smapMuted
    private static let coral = Color.smapPrimary // Soft Coral Peach — primary

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
            withAnimation(reduceMotion ? nil : .easeOut(duration: 0.45).delay(0.05)) {
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
