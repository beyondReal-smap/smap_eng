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
                    Text("하루책")
                        .font(.atozBlack(40))
                        .foregroundStyle(Color.smapText)

                    Text("매일 한 권, 우리 아이의 영어 동화책")
                        .font(.atozRegular(15))
                        .foregroundStyle(Color.smapMuted)
                        .multilineTextAlignment(.center)
                }

                Spacer()

                VStack(spacing: 12) {
                    // App Store Review Guideline 4.8 — Sign in with Apple은 다른 소셜 옵션과
                    // 동등하거나 위에 배치해야 한다. 가장 위에 둔다.
                    SignInWithAppleButton(.continue) { request in
                        let nonce = AppleSignInNonce.make()
                        appleNonce = nonce
                        request.requestedScopes = [.fullName, .email]
                        request.nonce = nonce.hashed
                    } onCompletion: { result in
                        appleSignInBusy = true
                        Task {
                            defer { appleSignInBusy = false }
                            switch result {
                            case .success(let authorization):
                                guard let nonce = appleNonce else { return }
                                await auth.signInWithApple(
                                    authorization: authorization,
                                    rawNonce: nonce.raw,
                                )
                                appleNonce = nil
                            case .failure(let error):
                                auth.handleAppleError(error)
                                appleNonce = nil
                            }
                        }
                    }
                    .signInWithAppleButtonStyle(colorScheme == .dark ? .white : .black)
                    .frame(height: 52)
                    .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
                    .disabled(inFlightProvider != nil || appleSignInBusy)

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
                    ) {
                        Task { await signIn(provider: "kakao") }
                    }

                    PrimaryButton(
                        title: "이메일로 시작하기",
                        icon: Image(systemName: "envelope.fill"),
                        variant: .outline,
                        isLoading: false,
                        isEnabled: inFlightProvider == nil && !appleSignInBusy,
                    ) {
                        showEmailFlow = true
                    }
                }

                if let error = auth.lastError {
                    Text(error)
                        .font(.smapCaption)
                        .foregroundStyle(Color.smapDanger)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal, 12)
                }

                // SwiftUI Text는 마크다운 링크를 자동 파싱한다.
                // 커스텀 스킴 `smap://legal/{terms,privacy}`를 openURL 환경값에서 가로채
                // 외부 Safari가 아닌 인앱 sheet로 표시한다(App Store 2.3.7/5.1.1).
                Text(
                    "로그인하면 [이용약관](smap://legal/terms)과 [개인정보처리방침](smap://legal/privacy)에 동의한 것으로 간주합니다.",
                )
                .font(.smapCaption)
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
}

#Preview {
    LoginView()
        .environment(AuthState.shared)
}
