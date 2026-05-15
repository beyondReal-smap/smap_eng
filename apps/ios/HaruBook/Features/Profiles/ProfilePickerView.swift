import SwiftUI

struct ProfilePickerView: View {
    @State private var viewModel = ProfileViewModel()
    @State private var newName: String = ""
    @State private var isCreating: Bool = false
    @State private var showOnboarding: Bool = false
    let onSelect: (Profile) -> Void

    var body: some View {
        ZStack {
            Color.smapBackground.ignoresSafeArea()

            VStack(alignment: .leading, spacing: 20) {
                VStack(alignment: .leading, spacing: 6) {
                    Text("우리 가족")
                        .font(.smapDisplay)
                        .foregroundStyle(Color.smapText)
                    Text("오늘은 누가 책을 읽을까요?")
                        .font(.smapBody)
                        .foregroundStyle(Color.smapMuted)
                }
                .padding(.horizontal, 24)
                .padding(.top, 8)

                if viewModel.isLoading && viewModel.profiles.isEmpty {
                    Spacer()
                    ProgressView().tint(Color.smapPrimary)
                    Spacer()
                } else if let error = viewModel.error, viewModel.profiles.isEmpty {
                    Spacer()
                    Text(error)
                        .font(.smapBody)
                        .foregroundStyle(Color.smapDanger)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal, 24)
                    PrimaryButton(title: "다시 시도", variant: .tonal) {
                        Task { await viewModel.load() }
                    }
                    .padding(.horizontal, 24)
                    Spacer()
                } else {
                    ScrollView {
                        LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 16) {
                            ForEach(viewModel.profiles) { profile in
                                Button {
                                    onSelect(profile)
                                } label: {
                                    ProfileCard(profile: profile)
                                }
                                .buttonStyle(.plain)
                            }

                            Button {
                                isCreating = true
                            } label: {
                                AddProfileCard()
                            }
                            .buttonStyle(.plain)
                        }
                        .padding(.horizontal, 24)
                        .padding(.bottom, 32)
                    }
                }
            }
        }
        .task {
            await viewModel.load()
            // 신규 가입자(예: OAuth 첫 로그인)는 프로필이 0개. 첫 프로필 생성을 강제 유도한다.
            // 이메일 가입은 서버가 ⭐ 프로필을 자동 생성하므로 이 분기를 타지 않는다.
            if viewModel.error == nil && viewModel.profiles.isEmpty {
                showOnboarding = true
            }
        }
        .sheet(isPresented: $isCreating) {
            CreateProfileSheet(viewModel: viewModel, isPresented: $isCreating)
        }
        .fullScreenCover(isPresented: $showOnboarding) {
            NavigationStack {
                OnboardingView { newProfile in
                    viewModel.profiles.append(newProfile)
                    showOnboarding = false
                    // 첫 프로필 생성 직후 그 프로필로 자동 진입.
                    onSelect(newProfile)
                }
            }
        }
    }
}

private struct ProfileCard: View {
    let profile: Profile

    var body: some View {
        VStack(spacing: 12) {
            ZStack {
                Circle()
                    .fill(Color.smapPrimarySoft)
                    .frame(width: 96, height: 96)
                Text(String(profile.name.prefix(1)))
                    .font(.smapDisplay)
                    .foregroundStyle(Color.smapPrimary)
            }
            Text(profile.name)
                .font(.smapBodyEmphasis)
                .foregroundStyle(Color.smapText)
        }
        .frame(maxWidth: .infinity, minHeight: 180)
        .padding(.vertical, 18)
        .background(Color.smapSurface)
        .clipShape(RoundedRectangle(cornerRadius: 24, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 24, style: .continuous)
                .stroke(Color.smapBorder, lineWidth: 1)
        )
    }
}

private struct AddProfileCard: View {
    var body: some View {
        VStack(spacing: 12) {
            Image(systemName: "plus.circle.fill")
                .font(.system(size: 48))
                .foregroundStyle(Color.smapPrimary)
            Text("프로필 추가")
                .font(.smapBodyEmphasis)
                .foregroundStyle(Color.smapPrimary)
        }
        .frame(maxWidth: .infinity, minHeight: 180)
        .padding(.vertical, 18)
        .background(Color.smapPrimarySoft)
        .clipShape(RoundedRectangle(cornerRadius: 24, style: .continuous))
    }
}

private struct CreateProfileSheet: View {
    @Bindable var viewModel: ProfileViewModel
    @Binding var isPresented: Bool
    @State private var name: String = ""
    @State private var isSubmitting: Bool = false

    var body: some View {
        NavigationStack {
            VStack(alignment: .leading, spacing: 16) {
                Text("프로필 이름을 알려주세요.")
                    .font(.smapBody)
                    .foregroundStyle(Color.smapMuted)

                TextField("예: 지우", text: $name)
                    .font(.smapHeading)
                    .padding(14)
                    .background(Color.smapPrimarySoft)
                    .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
                    .submitLabel(.done)

                Spacer()

                PrimaryButton(
                    title: "추가하기",
                    variant: .filled,
                    isLoading: isSubmitting,
                    isEnabled: !name.trimmingCharacters(in: .whitespaces).isEmpty && !isSubmitting
                ) {
                    Task {
                        isSubmitting = true
                        await viewModel.create(name: name)
                        isSubmitting = false
                        if viewModel.error == nil { isPresented = false }
                    }
                }
            }
            .padding(24)
            .background(Color.smapBackground)
            .navigationTitle("새 프로필")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("취소") { isPresented = false }
                }
            }
        }
        .presentationDetents([.medium])
    }
}
