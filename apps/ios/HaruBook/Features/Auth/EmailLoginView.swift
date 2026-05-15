import SwiftUI

/// 이메일 + 비밀번호 로그인. 소셜 외 대안 경로.
struct EmailLoginView: View {
    @Environment(AuthState.self) private var auth
    @Environment(\.dismiss) private var dismiss

    @State private var email: String = ""
    @State private var password: String = ""
    @State private var isSubmitting: Bool = false
    @State private var errorMessage: String?
    @State private var showSignup: Bool = false

    var body: some View {
        ZStack {
            Color.smapBackground.ignoresSafeArea()

            ScrollView {
                VStack(alignment: .leading, spacing: 24) {
                    header

                    VStack(spacing: 16) {
                        labeledField(
                            label: "이메일",
                            placeholder: "you@example.com",
                            text: $email,
                            keyboard: .emailAddress,
                            isSecure: false,
                        )

                        labeledField(
                            label: "비밀번호",
                            placeholder: "8자 이상",
                            text: $password,
                            keyboard: .default,
                            isSecure: true,
                        )
                    }

                    if let errorMessage {
                        Text(errorMessage)
                            .font(.smapCaption)
                            .foregroundStyle(Color.smapDanger)
                    }

                    PrimaryButton(
                        title: "로그인",
                        variant: .filled,
                        isLoading: isSubmitting,
                        isEnabled: canSubmit,
                    ) {
                        Task { await submit() }
                    }

                    HStack(spacing: 4) {
                        Text("아직 계정이 없으신가요?")
                            .font(.smapBody)
                            .foregroundStyle(Color.smapMuted)
                        Button("회원가입") { showSignup = true }
                            .font(.smapBodyEmphasis)
                            .foregroundStyle(Color.smapPrimary)
                    }
                    .frame(maxWidth: .infinity, alignment: .center)
                    .padding(.top, 4)
                }
                .padding(.horizontal, 24)
                .padding(.vertical, 32)
            }
        }
        .navigationTitle("이메일 로그인")
        .navigationBarTitleDisplayMode(.inline)
        .navigationDestination(isPresented: $showSignup) {
            EmailSignupView(onCompleted: {
                showSignup = false
                dismiss()
            })
        }
    }

    private var canSubmit: Bool {
        !email.trimmingCharacters(in: .whitespaces).isEmpty
            && password.count >= 1
            && !isSubmitting
    }

    private var header: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("이메일로 로그인")
                .font(.smapTitle)
                .foregroundStyle(Color.smapText)
            Text("가입하신 이메일과 비밀번호를 입력해 주세요.")
                .font(.smapBody)
                .foregroundStyle(Color.smapMuted)
        }
    }

    private func labeledField(
        label: String,
        placeholder: String,
        text: Binding<String>,
        keyboard: UIKeyboardType,
        isSecure: Bool,
    ) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(label)
                .font(.smapCaption)
                .foregroundStyle(Color.smapMuted)
            Group {
                if isSecure {
                    SecureField(placeholder, text: text)
                } else {
                    TextField(placeholder, text: text)
                        .keyboardType(keyboard)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled(true)
                }
            }
            .padding(.vertical, 12)
            .padding(.horizontal, 14)
            .background(Color.smapSurface)
            .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 12, style: .continuous)
                    .stroke(Color.smapBorder, lineWidth: 1),
            )
        }
    }

    @MainActor
    private func submit() async {
        guard canSubmit else { return }
        isSubmitting = true
        errorMessage = nil
        let ok = await auth.signInWithEmail(
            email: email.trimmingCharacters(in: .whitespacesAndNewlines),
            password: password,
        )
        isSubmitting = false
        if !ok {
            errorMessage = auth.lastError
        }
    }
}
