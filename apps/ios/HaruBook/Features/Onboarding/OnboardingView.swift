import SwiftUI

/// 첫 아이 프로필 생성 화면 — 웹 `onboarding-form.tsx` 미러.
///
/// 진입 조건: 로그인 후 프로필이 0개일 때 (`HomeRouter`가 분기).
/// 이메일 가입 흐름은 서버가 ⭐ 프로필을 자동 생성하므로 OAuth 신규 가입자만 여기로 온다.
struct OnboardingView: View {
    /// 프로필 생성 성공 → 호출. 부모는 BookshelfView로 진입한다.
    var onProfileCreated: (Profile) -> Void

    @State private var childName: String = ""
    @State private var age: Int = 7
    @State private var avatar: String = "🦊"
    @State private var isSubmitting: Bool = false
    @State private var errorMessage: String?

    private let ageOptions = [5, 6, 7, 8, 9, 10]
    private let avatarOptions = ["🦊", "🐰", "🐻", "🐼", "🦁", "🐯", "🐨", "🐸"]

    var body: some View {
        ZStack {
            Color.smapBackground.ignoresSafeArea()

            ScrollView {
                VStack(alignment: .leading, spacing: 28) {
                    header
                    nameField
                    ageGrid
                    avatarGrid

                    if let errorMessage {
                        Text(errorMessage)
                            .font(.smapCaption)
                            .foregroundStyle(Color.smapDanger)
                    }

                    PrimaryButton(
                        title: "프로필 만들기",
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
        .navigationBarBackButtonHidden(true)
    }

    private var canSubmit: Bool {
        !childName.trimmingCharacters(in: .whitespaces).isEmpty && !isSubmitting
    }

    private var header: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("아이의 첫 프로필을 만들어주세요")
                .font(.smapTitle)
                .foregroundStyle(Color.smapText)
            Text("나이와 닉네임에 맞춰 그 또래 영어 동화를 준비해드려요. 나중에 가족 프로필을 더 추가할 수 있어요.")
                .font(.smapBody)
                .foregroundStyle(Color.smapMuted)
                .fixedSize(horizontal: false, vertical: true)
        }
    }

    private var nameField: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("아이 이름")
                .font(.smapCaption)
                .foregroundStyle(Color.smapMuted)
            TextField("예: 지우", text: $childName)
                .padding(.vertical, 12)
                .padding(.horizontal, 14)
                .background(Color.smapSurface)
                .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                .overlay(
                    RoundedRectangle(cornerRadius: 12, style: .continuous)
                        .stroke(Color.smapBorder, lineWidth: 1),
                )
                .disabled(isSubmitting)
        }
    }

    private var ageGrid: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("나이")
                .font(.smapCaption)
                .foregroundStyle(Color.smapMuted)
            LazyVGrid(
                columns: Array(repeating: GridItem(.flexible(), spacing: 8), count: 3),
                spacing: 8,
            ) {
                ForEach(ageOptions, id: \.self) { n in
                    Button {
                        age = n
                    } label: {
                        Text("\(n)세")
                            .font(.smapBodyEmphasis)
                            .frame(maxWidth: .infinity, minHeight: 48)
                            .background(age == n ? Color.smapPrimary : Color.smapSurface)
                            .foregroundStyle(age == n ? Color.white : Color.smapText)
                            .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                            .overlay(
                                RoundedRectangle(cornerRadius: 12, style: .continuous)
                                    .stroke(Color.smapBorder, lineWidth: age == n ? 0 : 1),
                            )
                    }
                    .buttonStyle(.plain)
                    .disabled(isSubmitting)
                }
            }
        }
    }

    private var avatarGrid: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("아바타")
                .font(.smapCaption)
                .foregroundStyle(Color.smapMuted)
            LazyVGrid(
                columns: Array(repeating: GridItem(.flexible(), spacing: 8), count: 4),
                spacing: 8,
            ) {
                ForEach(avatarOptions, id: \.self) { emoji in
                    Button {
                        avatar = emoji
                    } label: {
                        Text(emoji)
                            .font(.system(size: 32))
                            .frame(maxWidth: .infinity, minHeight: 56)
                            .background(avatar == emoji ? Color.smapPrimarySoft : Color.smapSurface)
                            .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
                            .overlay(
                                RoundedRectangle(cornerRadius: 16, style: .continuous)
                                    .stroke(
                                        avatar == emoji ? Color.smapPrimary : Color.smapBorder,
                                        lineWidth: avatar == emoji ? 2 : 1,
                                    ),
                            )
                    }
                    .buttonStyle(.plain)
                    .disabled(isSubmitting)
                }
            }
        }
    }

    @MainActor
    private func submit() async {
        guard canSubmit else { return }
        isSubmitting = true
        errorMessage = nil
        do {
            let request = OnboardingProfileRequest(
                name: childName.trimmingCharacters(in: .whitespacesAndNewlines),
                age: age,
                avatar: avatar,
            )
            let response: ProfileEnvelope = try await APIClient.shared.send(
                Endpoint(
                    path: "/api/profiles",
                    method: .post,
                    body: request,
                    requiresAuth: true,
                ),
            )
            isSubmitting = false
            onProfileCreated(response.profile)
        } catch {
            isSubmitting = false
            errorMessage = "프로필 생성에 실패했어요. 잠시 후 다시 시도해 주세요."
        }
    }
}

private struct OnboardingProfileRequest: Encodable {
    let name: String
    let age: Int
    let avatar: String
}

private struct ProfileEnvelope: Decodable {
    let profile: Profile
}
