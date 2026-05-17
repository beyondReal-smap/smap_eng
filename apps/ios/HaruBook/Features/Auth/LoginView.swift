import SwiftUI
import AuthenticationServices

struct LoginView: View {
    @Environment(AuthState.self) private var auth
    @Environment(\.colorScheme) private var colorScheme
    @State private var inFlightProvider: String?
    @State private var legalSheet: LegalDocument?
    @State private var showEmailFlow: Bool = false
    @State private var appleNonce: AppleSignInNonce?
    @State private var appleSignInBusy: Bool = false
    /// ASAuthorizationController는 강한 참조를 보관하지 않으므로 View가 coordinator를
    /// 보관해야 한다. SwiftUI @State 로 lifecycle 묶음.
    @State private var appleCoordinator = AppleSignInCoordinator()

    var body: some View {
        ZStack {
            Color.smapBackground.ignoresSafeArea()

            VStack(spacing: 28) {
                Spacer()

                VStack(spacing: 14) {
                    Image("LoginIcon")
                        .resizable()
                        .scaledToFit()
                        .frame(width: 84, height: 84)
                        .clipShape(RoundedRectangle(cornerRadius: 20, style: .continuous))
                        .accessibilityHidden(true)

                    // 웹 랜딩/메인과 동일한 손글씨 폰트 A2Z 9 Black.
                    // `.font(_:)` modifier가 `Font?` 를 받아 leading-dot 멤버 추론이
                    // 실패하므로 `Font.` 를 명시한다.
                    Text("하루책")
                        .font(Font.atozBlack(40))
                        .foregroundStyle(Color.smapText)

                    Text("매일 한 권, 우리 아이의 영어 동화책")
                        .font(Font.atozRegular(15))
                        .foregroundStyle(Color.smapMuted)
                        .multilineTextAlignment(.center)
                }

                Spacer()

                VStack(spacing: 12) {
                    // App Store Review Guideline 4.8 — Sign in with Apple은 다른 소셜 옵션과
                    // 동등하거나 위에 배치한다. 가장 위.
                    // 커스텀 PrimaryButton + ASAuthorizationController 직접 호출 — 다른 버튼과
                    // 동일한 폰트/모양/스타일을 유지하기 위함. 검정 배경/흰 텍스트/applelogo
                    // SF Symbol 조합은 Apple HIG의 SiwA 가이드를 준수한다.
                    PrimaryButton(
                        title: "Apple로 계속하기",
                        icon: Image(systemName: "applelogo"),
                        variant: .filled,
                        isLoading: appleSignInBusy,
                        isEnabled: inFlightProvider == nil && !appleSignInBusy,
                        backgroundOverride: Color.black,
                        foregroundOverride: Color.white,
                        fontOverride: Font.atozBold(17),
                    ) {
                        startAppleSignIn()
                    }

                    // Google 공식 sign-in 가이드: 흰 배경 + 연한 회색 외곽선 + 검정 텍스트.
                    // GoogleG 자산은 4색(빨강/파랑/노랑/초록) SVG. .renderingMode(.original)로
                    // PrimaryButton 내부 foregroundStyle 영향을 받지 않고 원본 색 유지.
                    PrimaryButton(
                        title: "Google로 계속하기",
                        icon: Image("GoogleG").renderingMode(.original),
                        variant: .filled,
                        isLoading: inFlightProvider == "google",
                        isEnabled: inFlightProvider == nil && !appleSignInBusy,
                        backgroundOverride: Color.white,
                        foregroundOverride: Color(hex: 0x1F1F1F),
                        borderOverride: Color(hex: 0xDADCE0),
                        fontOverride: Font.atozBold(17),
                    ) {
                        Task { await signIn(provider: "google") }
                    }

                    // 카카오 브랜드 가이드: 노란색(#FEE500) 배경 + 검정(#191600) 텍스트/말풍선.
                    PrimaryButton(
                        title: "카카오로 계속하기",
                        icon: Image(systemName: "bubble.left.fill"),
                        variant: .filled,
                        isLoading: inFlightProvider == "kakao",
                        isEnabled: inFlightProvider == nil && !appleSignInBusy,
                        backgroundOverride: Color(hex: 0xFEE500),
                        foregroundOverride: Color(hex: 0x191600),
                        fontOverride: Font.atozBold(17),
                    ) {
                        Task { await signIn(provider: "kakao") }
                    }

                    PrimaryButton(
                        title: "이메일로 시작하기",
                        icon: Image(systemName: "envelope.fill"),
                        variant: .outline,
                        isLoading: false,
                        isEnabled: inFlightProvider == nil && !appleSignInBusy,
                        fontOverride: Font.atozBold(17),
                    ) {
                        showEmailFlow = true
                    }
                }

                if let error = auth.lastError {
                    Text(error)
                        .font(Font.atozRegular(13))
                        .foregroundStyle(Color.smapDanger)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal, 12)
                }

                // SwiftUI Text는 마크다운 링크를 자동 파싱한다.
                // 커스텀 스킴 `smap://legal/{terms,privacy}`를 openURL 환경값에서 가로채
                // 외부 Safari가 아닌 인앱 sheet로 표시한다(App Store 2.3.7/5.1.1).
                // 폰트 14pt + lineSpacing 2 — 약관/링크 영역은 사용자가 한 번은 읽고 결정해야 하는
                // 정보. 13pt는 동적 폰트 미적용 환경에서 시각 가독성·VoiceOver 외 사용자에게도 부담.
                // 마크다운 링크([이용약관]/[개인정보처리방침])는 SwiftUI Text가 자동으로 Link 트레이트를
                // 부여하므로 VoiceOver 로터의 Links에서 발견된다.
                Text(
                    "로그인하면 [이용약관](smap://legal/terms)과 [개인정보처리방침](smap://legal/privacy)에 동의한 것으로 간주합니다.",
                )
                .font(Font.atozRegular(14))
                .lineSpacing(2)
                .foregroundStyle(Color.smapMuted)
                .tint(.smapPrimary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 8)
                .environment(\.openURL, OpenURLAction { url in
                    if url.scheme == "smap", url.host == "legal" {
                        let raw = url.lastPathComponent
                        if let doc = LegalDocument(rawValue: raw) {
                            legalSheet = doc
                            return .handled
                        }
                    }
                    return .systemAction
                })
            }
            .padding(.horizontal, 24)
            .padding(.bottom, 32)
        }
        .sheet(item: $legalSheet) { doc in
            NavigationStack {
                LegalDocumentView(document: doc)
                    .toolbar {
                        ToolbarItem(placement: .topBarTrailing) {
                            Button("닫기") { legalSheet = nil }
                        }
                    }
            }
        }
        .sheet(isPresented: $showEmailFlow) {
            NavigationStack {
                EmailLoginView()
                    .toolbar {
                        ToolbarItem(placement: .topBarLeading) {
                            Button("닫기") { showEmailFlow = false }
                        }
                    }
            }
        }
    }

    private func signIn(provider: String) async {
        inFlightProvider = provider
        defer { inFlightProvider = nil }
        await auth.signIn(provider: provider)
    }

    /// Apple 인증 시작 — nonce 생성, coordinator로 ASAuthorizationController 호출,
    /// 결과를 받아 백엔드로 전달.
    private func startAppleSignIn() {
        let nonce = AppleSignInNonce.make()
        appleNonce = nonce
        appleSignInBusy = true

        appleCoordinator.onCompletion = { result in
            Task { @MainActor in
                defer {
                    appleSignInBusy = false
                    appleNonce = nil
                }
                switch result {
                case .success(let authorization):
                    await auth.signInWithApple(
                        authorization: authorization,
                        rawNonce: nonce.raw,
                    )
                case .failure(let error):
                    auth.handleAppleError(error)
                }
            }
        }
        appleCoordinator.start(nonceHashed: nonce.hashed)
    }
}

#Preview {
    LoginView()
        .environment(AuthState.shared)
}
