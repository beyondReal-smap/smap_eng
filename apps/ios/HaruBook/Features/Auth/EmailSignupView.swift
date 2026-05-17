import SwiftUI

/// 이메일 회원가입 — 웹 `email-signup-form.tsx` 미러.
///
/// 필드: 아이 이름 / 이메일 / 비밀번호 + 3개 분리 동의 체크박스 (정보통신망법 §31, 약관규제법,
/// 개인정보보호법 §22 — 만 14세 이상 확인, 이용약관, 개인정보 수집·이용은 각각 분리하여 받는다).
///
/// 가입 성공 시 서버가 기본 ⭐ 프로필을 자동 생성하므로 곧바로 책장에 진입한다.
/// 따라서 별도 OnboardingView push가 필요 없다 — 단, OAuth 신규 가입의 경우는
/// HomeRouter가 프로필 0개를 감지하여 onboarding 분기를 한다.
struct EmailSignupView: View {
    @Environment(AuthState.self) private var auth

    /// 가입 성공 → 호출. 부모는 모달/스택 정리를 처리.
    var onCompleted: () -> Void

    @State private var childName: String = ""
    @State private var email: String = ""
    @State private var password: String = ""
    /// 비밀번호 재입력 — 오타로 잘못 가입 후 로그인 불가 상태가 되는 사고를 막는 표준 UX.
    @State private var confirmPassword: String = ""
    @State private var agreeAge: Bool = false
    @State private var agreeTerms: Bool = false
    @State private var agreePrivacy: Bool = false
    @State private var legalSheet: LegalDocument?

    @State private var isSubmitting: Bool = false
    @State private var emailFieldError: String?
    @State private var passwordFieldError: String?
    @State private var confirmPasswordFieldError: String?
    @State private var generalError: String?
    /// 비밀번호 가시성 — 입력 오류 자가 확인용.
    @State private var isPasswordVisible: Bool = false

    var body: some View {
        ZStack {
            Color.smapBackground.ignoresSafeArea()

            ScrollView {
                VStack(alignment: .leading, spacing: 24) {
                    header

                    VStack(spacing: 16) {
                        labeledField(
                            label: "아이 이름 (또는 별명)",
                            placeholder: "예: 지우",
                            text: $childName,
                            keyboard: .default,
                            isSecure: false,
                            error: nil,
                        )

                        labeledField(
                            label: "이메일",
                            placeholder: "you@example.com",
                            text: $email,
                            keyboard: .emailAddress,
                            isSecure: false,
                            error: emailFieldError,
                        )

                        passwordField

                        confirmPasswordField
                    }

                    agreementsBlock

                    if let generalError {
                        Text(generalError)
                            .font(.smapCaption)
                            .foregroundStyle(Color.smapDanger)
                    }

                    PrimaryButton(
                        title: "가입하고 시작",
                        variant: .filled,
                        isLoading: isSubmitting,
                        isEnabled: canSubmit,
                    ) {
                        Task { await submit() }
                    }
                }
                .padding(.horizontal, 24)
                .padding(.vertical, 32)
            }
        }
        .navigationTitle("회원가입")
        .navigationBarTitleDisplayMode(.inline)
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

    // MARK: - Computed

    private var canSubmit: Bool {
        !childName.trimmingCharacters(in: .whitespaces).isEmpty
            && !email.trimmingCharacters(in: .whitespaces).isEmpty
            && password.count >= 8
            && password == confirmPassword
            && agreeAge
            && agreeTerms
            && agreePrivacy
            && !isSubmitting
    }

    // MARK: - Sections

    private var header: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("계정 만들기")
                .font(.smapTitle)
                .foregroundStyle(Color.smapText)
            Text("아이의 영어 학습 여정을 시작해 보세요.")
                .font(.smapBody)
                .foregroundStyle(Color.smapMuted)
        }
    }

    private var agreementsBlock: some View {
        VStack(alignment: .leading, spacing: 12) {
            consentToggle(
                isOn: $agreeAge,
                title: "[필수] 만 14세 이상 보호자입니다.",
                tappableTitle: nil,
                onTap: nil,
            )
            consentToggle(
                isOn: $agreeTerms,
                title: "[필수] 이용약관에 동의합니다.",
                tappableTitle: "이용약관 보기",
                onTap: { legalSheet = .terms },
            )
            consentToggle(
                isOn: $agreePrivacy,
                title: "[필수] 개인정보 수집·이용에 동의합니다.",
                tappableTitle: "개인정보처리방침 보기",
                onTap: { legalSheet = .privacy },
            )
        }
    }

    private func consentToggle(
        isOn: Binding<Bool>,
        title: String,
        tappableTitle: String?,
        onTap: (() -> Void)?,
    ) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Toggle(isOn: isOn) {
                Text(title)
                    .font(.smapBody)
                    .foregroundStyle(Color.smapText)
            }
            .tint(.smapPrimary)
            .disabled(isSubmitting)

            if let tappableTitle, let onTap {
                Button(tappableTitle, action: onTap)
                    .font(.smapCaption)
                    .foregroundStyle(Color.smapPrimary)
                    .padding(.leading, 4)
            }
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
                        TextField("영문 + 숫자 포함 8자 이상", text: $password)
                            .textInputAutocapitalization(.never)
                            .autocorrectionDisabled(true)
                    } else {
                        SecureField("영문 + 숫자 포함 8자 이상", text: $password)
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
                    .stroke(passwordFieldError != nil ? Color.smapDanger : Color.smapBorder, lineWidth: 1),
            )
            if let passwordFieldError {
                Text(passwordFieldError)
                    .font(.smapCaption)
                    .foregroundStyle(Color.smapDanger)
            }
        }
    }

    /// 비밀번호 재입력 — 토글 없이 SecureField 단일. 가시화는 위의 비밀번호 필드에서만 허용해
    /// "한쪽만 평문일 때 그쪽 값을 보고 그대로 옮겨치는" 우회 패턴을 차단한다.
    private var confirmPasswordField: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("비밀번호 확인")
                .font(.smapCaption)
                .foregroundStyle(Color.smapMuted)
            SecureField("위와 동일하게 입력", text: $confirmPassword)
                .padding(.vertical, 12)
                .padding(.horizontal, 14)
                .background(Color.smapSurface)
                .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                .overlay(
                    RoundedRectangle(cornerRadius: 12, style: .continuous)
                        .stroke(confirmPasswordFieldError != nil ? Color.smapDanger : Color.smapBorder, lineWidth: 1),
                )
            if let confirmPasswordFieldError {
                Text(confirmPasswordFieldError)
                    .font(.smapCaption)
                    .foregroundStyle(Color.smapDanger)
            }
        }
    }

    private func labeledField(
        label: String,
        placeholder: String,
        text: Binding<String>,
        keyboard: UIKeyboardType,
        isSecure: Bool,
        error: String?,
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
                        .textInputAutocapitalization(keyboard == .emailAddress ? .never : .sentences)
                        .autocorrectionDisabled(keyboard == .emailAddress)
                }
            }
            .padding(.vertical, 12)
            .padding(.horizontal, 14)
            .background(Color.smapSurface)
            .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 12, style: .continuous)
                    .stroke(error != nil ? Color.smapDanger : Color.smapBorder, lineWidth: 1),
            )
            if let error {
                Text(error)
                    .font(.smapCaption)
                    .foregroundStyle(Color.smapDanger)
            }
        }
    }

    @MainActor
    private func submit() async {
        guard canSubmit else { return }

        // 클라이언트 측 사전 검증 — 비밀번호 규칙(영문+숫자) 웹 `SignupSchema`와 동일.
        passwordFieldError = nil
        confirmPasswordFieldError = nil
        emailFieldError = nil
        generalError = nil

        let pw = password
        let hasLetter = pw.range(of: "[A-Za-z]", options: .regularExpression) != nil
        let hasDigit = pw.range(of: "[0-9]", options: .regularExpression) != nil
        if pw.count < 8 || !hasLetter || !hasDigit {
            passwordFieldError = "비밀번호는 영문과 숫자를 포함해 8자 이상이어야 해요."
            return
        }
        // 재입력 불일치는 사용자가 흔히 만나는 오타. 명시적 메시지 + 빨간 border로 즉시 인지하게.
        if pw != confirmPassword {
            confirmPasswordFieldError = "비밀번호가 일치하지 않아요."
            return
        }

        isSubmitting = true
        let outcome = await auth.signUp(
            childName: childName.trimmingCharacters(in: .whitespacesAndNewlines),
            email: email.trimmingCharacters(in: .whitespacesAndNewlines),
            password: pw,
            agreeAge: agreeAge,
            agreeTerms: agreeTerms,
            agreePrivacy: agreePrivacy,
        )
        isSubmitting = false

        switch outcome {
        case .success:
            onCompleted()
        case .duplicateEmail:
            emailFieldError = "이미 가입된 이메일이에요."
        case .failure(let message):
            generalError = message
        }
    }
}
