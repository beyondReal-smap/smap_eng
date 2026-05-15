import SwiftUI

struct LoginView: View {
    @Environment(AuthState.self) private var auth
    @State private var inFlightProvider: String?
    @State private var legalSheet: LegalDocument?

    var body: some View {
        ZStack {
            Color.smapBackground.ignoresSafeArea()

            VStack(spacing: 28) {
                Spacer()

                VStack(spacing: 16) {
                    Image("LoginIcon")
                        .resizable()
                        .scaledToFit()
                        .frame(width: 132, height: 132)
                        .accessibilityHidden(true)

                    Text("하루책")
                        .font(.smapDisplay)
                        .foregroundStyle(Color.smapText)

                    Text("매일 한 권, 우리 아이의 영어 동화책")
                        .font(.smapBody)
                        .foregroundStyle(Color.smapMuted)
                        .multilineTextAlignment(.center)
                }

                Spacer()

                VStack(spacing: 12) {
                    PrimaryButton(
                        title: "Google로 계속하기",
                        icon: Image(systemName: "g.circle.fill"),
                        variant: .filled,
                        isLoading: inFlightProvider == "google",
                        isEnabled: inFlightProvider == nil
                    ) {
                        Task { await signIn(provider: "google") }
                    }

                    PrimaryButton(
                        title: "카카오로 계속하기",
                        icon: Image(systemName: "bubble.left.fill"),
                        variant: .tonal,
                        isLoading: inFlightProvider == "kakao",
                        isEnabled: inFlightProvider == nil
                    ) {
                        Task { await signIn(provider: "kakao") }
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
