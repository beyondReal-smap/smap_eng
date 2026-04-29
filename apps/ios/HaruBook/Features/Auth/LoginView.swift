import SwiftUI

struct LoginView: View {
    @Environment(AuthState.self) private var auth
    @State private var inFlightProvider: String?

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

                Text("로그인하면 [이용약관]과 [개인정보처리방침]에 동의한 것으로 간주합니다.")
                    .font(.smapCaption)
                    .foregroundStyle(Color.smapMuted)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 8)
            }
            .padding(.horizontal, 24)
            .padding(.bottom, 32)
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
