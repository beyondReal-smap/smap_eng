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
    /// 비밀번호 가시성 — 입력 오류를 사용자가 직접 확인할 수 있어 모바일 환경에서 재입력 비율을 크게 낮춤.
    @State private var isPasswordVisible: Bool = false

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

                        passwordField
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

    /// 비밀번호 입력 — SecureField/TextField 토글 + 우측 눈 아이콘.
    private var passwordField: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("비밀번호")
                .font(.smapCaption)
                .foregroundStyle(Color.smapMuted)
            HStack(spacing: 8) {
                Group {
                    if isPasswordVisible {
                        TextField("8자 이상", text: $password)
                            .textInputAutocapitalization(.never)
                            .autocorrectionDisabled(true)
                    } else {
                        SecureField("8자 이상", text: $password)
                    }
                }
                Button {
                    isPasswordVisible.toggle()
                } label: {
                    Image(systemName: isPasswordVisible ? "eye.slash" : "eye")
                        .foregroundStyle(Color.smapMuted)
                        .frame(width: 24, height: 24)
                }
                .buttonStyle(.plain)
                .accessibilityLabel(isPasswordVisible ? "비밀번호 숨기기" : "비밀번호 표시")
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
