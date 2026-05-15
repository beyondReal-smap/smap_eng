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
    @State private var agreeAge: Bool = false
    @State private var agreeTerms: Bool = false
    @State private var agreePrivacy: Bool = false
    @State private var legalSheet: LegalDocument?

    @State private var isSubmitting: Bool = false
    @State private var emailFieldError: String?
    @State private var passwordFieldError: String?
    @State private var generalError: String?

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

                        labeledField(
                            label: "비밀번호",
                            placeholder: "영문 + 숫자 포함 8자 이상",
                            text: $password,
                            keyboard: .default,
                            isSecure: true,
                            error: passwordFieldError,
                        )
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
        emailFieldError = nil
        generalError = nil

        let pw = password
        let hasLetter = pw.range(of: "[A-Za-z]", options: .regularExpression) != nil
        let hasDigit = pw.range(of: "[0-9]", options: .regularExpression) != nil
        if pw.count < 8 || !hasLetter || !hasDigit {
            passwordFieldError = "비밀번호는 영문과 숫자를 포함해 8자 이상이어야 해요."
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
