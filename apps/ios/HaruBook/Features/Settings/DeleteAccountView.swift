import SwiftUI

/// 계정 삭제 흐름. App Store 5.1.1(v) 요구사항 충족을 위해 인앱에서 완결된다.
///
/// 2단계 확인:
///  1) "삭제 동의" 체크박스
///  2) "삭제합니다" 정확 일치 텍스트 입력
/// 두 조건이 모두 통과해야 버튼이 활성화된다.
struct DeleteAccountView: View {
    @Environment(AuthState.self) private var auth
    @Environment(\.dismiss) private var dismiss

    /// 삭제 성공 → 호출. 부모는 시트 닫기 + LoginView 복귀를 처리한다.
    var onCompleted: () -> Void

    @State private var agreedToConsequences: Bool = false
    @State private var confirmationText: String = ""
    @State private var isSubmitting: Bool = false
    @State private var errorMessage: String?

    private let confirmationPhrase = "삭제합니다"

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                header

                consequencesBlock

                consentToggle

                confirmationField

                if let errorMessage {
                    Text(errorMessage)
                        .font(.smapCaption)
                        .foregroundStyle(Color.smapDanger)
                }

                PrimaryButton(
                    title: "계정 영구 삭제",
                    variant: .filled,
                    isLoading: isSubmitting,
                    isEnabled: canSubmit,
                ) {
                    Task { await submit() }
                }
                .tint(.smapDanger)

                PrimaryButton(title: "취소", variant: .outline) {
                    dismiss()
                }
                .disabled(isSubmitting)
            }
            .padding(20)
        }
        .background(Color.smapBackground.ignoresSafeArea())
        .navigationTitle("계정 삭제")
        .navigationBarTitleDisplayMode(.inline)
        .interactiveDismissDisabled(isSubmitting)
    }

    private var canSubmit: Bool {
        agreedToConsequences
            && confirmationText.trimmingCharacters(in: .whitespacesAndNewlines) == confirmationPhrase
            && !isSubmitting
    }

    private var header: some View {
        VStack(alignment: .leading, spacing: 8) {
            Image(systemName: "exclamationmark.triangle.fill")
                .font(.system(size: 36))
                .foregroundStyle(Color.smapDanger)
            Text("정말 계정을 삭제하시겠어요?")
                .font(.smapTitle)
                .foregroundStyle(Color.smapText)
            Text("삭제 후에는 같은 이메일로 다시 가입해도 이전 데이터를 복구할 수 없습니다.")
                .font(.smapBody)
                .foregroundStyle(Color.smapMuted)
        }
    }

    private var consequencesBlock: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("삭제되는 데이터")
                .font(.smapBodyEmphasis)
                .foregroundStyle(Color.smapText)
            ForEach([
                "모든 아이 프로필",
                "지금까지 만든 모든 동화책",
                "독서 기록, 퀴즈 점수, 단어 학습",
                "보호자 리포트",
                "결제 이력 및 잔여 별(⭐)",
            ], id: \.self) { item in
                HStack(alignment: .top, spacing: 8) {
                    Text("•")
                        .foregroundStyle(Color.smapMuted)
                    Text(item)
                        .font(.smapBody)
                        .foregroundStyle(Color.smapText)
                }
            }
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color.smapSurface)
        .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 14, style: .continuous)
                .stroke(Color.smapBorder, lineWidth: 1),
        )
    }

    private var consentToggle: some View {
        Toggle(isOn: $agreedToConsequences) {
            Text("위의 모든 데이터가 영구적으로 사라지는 것에 동의합니다.")
                .font(.smapBody)
                .foregroundStyle(Color.smapText)
        }
        .tint(.smapPrimary)
        .disabled(isSubmitting)
    }

    private var confirmationField: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("계속하려면 아래 칸에 “\(confirmationPhrase)”을(를) 정확히 입력해 주세요.")
                .font(.smapCaption)
                .foregroundStyle(Color.smapMuted)
            TextField(confirmationPhrase, text: $confirmationText)
                .textFieldStyle(.roundedBorder)
                .autocorrectionDisabled(true)
                .textInputAutocapitalization(.never)
                .disabled(isSubmitting)
        }
    }

    @MainActor
    private func submit() async {
        guard canSubmit else { return }
        isSubmitting = true
        errorMessage = nil
        do {
            let endpoint = Endpoint<EmptyResponse>(
                path: "/api/account",
                method: .delete,
                requiresAuth: true,
            )
            _ = try await APIClient.shared.send(endpoint)
            // 서버는 user 행 cascade로 mobile_auth_tokens도 무효화한다.
            // 클라이언트도 즉시 Keychain 클리어 + LoginView 복귀.
            auth.signOut()
            isSubmitting = false
            onCompleted()
        } catch APIError.unauthorized {
            // 이미 토큰이 만료되어 signOut 된 상태. 그래도 onCompleted로 LoginView 진입.
            isSubmitting = false
            onCompleted()
        } catch {
            isSubmitting = false
            errorMessage = "삭제 중 문제가 발생했어요. 잠시 후 다시 시도해 주세요."
        }
    }
}
