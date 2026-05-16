import SwiftUI

struct ProfilePickerView: View {
    /// HomeRouter가 보유한 인스턴스를 주입받는다. 책장 ↔ 프로필 전환 시 데이터를 재페치하지 않고
    /// 이미 채워진 카드와 함께 슬라이드되어 들어오도록 하기 위함.
    @Bindable var viewModel: ProfileViewModel
    @State private var newName: String = ""
    @State private var isCreating: Bool = false
    @State private var profileToDelete: Profile?
    let onSelect: (Profile) -> Void
    /// 책장에서 "프로필 전환"을 통해 들어왔을 때 이전 프로필로 복귀하기 위한 콜백.
    /// 첫 로그인(돌아갈 프로필 없음) 흐름에서는 nil.
    var onCancel: (() -> Void)?

    var body: some View {
        ZStack {
            Color.smapBackground.ignoresSafeArea()

            VStack(alignment: .leading, spacing: 18) {
                HStack(alignment: .center, spacing: 12) {
                    if let onCancel {
                        Button {
                            onCancel()
                        } label: {
                            Image(systemName: "chevron.left")
                                .font(.system(size: 18, weight: .semibold))
                                .foregroundStyle(Color.smapText)
                                .frame(width: 44, height: 44)
                                .background(Color.smapSurface)
                                .clipShape(Circle())
                                .overlay(Circle().stroke(Color.smapBorder, lineWidth: 1))
                        }
                        .buttonStyle(.plain)
                        .accessibilityLabel("뒤로")
                    }

                    VStack(alignment: .leading, spacing: 4) {
                        Text("우리 가족")
                            .font(Font.atozBlack(34))
                            .foregroundStyle(Color.smapText)
                        Text("오늘은 누가 책을 읽을까요?")
                            .font(Font.atozRegular(15))
                            .foregroundStyle(Color.smapMuted)
                    }
                    Spacer()
                }
                .padding(.horizontal, 20)
                .padding(.top, 16)

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
                } else if viewModel.profiles.isEmpty {
                    // 프로필이 없는 상태 — 강제 모달 대신 친절한 empty state로 안내.
                    emptyState
                } else {
                    ScrollView {
                        LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 16) {
                            ForEach(viewModel.profiles) { profile in
                                ZStack(alignment: .topTrailing) {
                                    // 카드 본체 — 탭 시 프로필 선택.
                                    Button {
                                        onSelect(profile)
                                    } label: {
                                        ProfileCard(profile: profile)
                                    }
                                    .buttonStyle(.plain)

                                    // 우상단 ⋯ Menu — 한 번 탭으로 삭제 진입. contextMenu(long-press) 외에
                                    // 항상 보이는 명확한 진입점.
                                    Menu {
                                        Button(role: .destructive) {
                                            profileToDelete = profile
                                        } label: {
                                            Label("삭제", systemImage: "trash")
                                        }
                                    } label: {
                                        Image(systemName: "ellipsis")
                                            .font(.system(size: 13, weight: .bold))
                                            .frame(width: 30, height: 30)
                                            .foregroundStyle(Color.smapMuted)
                                            .background(Color.smapSurface)
                                            .clipShape(Circle())
                                            .overlay(Circle().stroke(Color.smapBorder, lineWidth: 1))
                                    }
                                    .padding(.top, 10)
                                    .padding(.trailing, 10)
                                    .accessibilityLabel("\(profile.name) 옵션")
                                }
                                // 길게 누르기로도 진입 가능 — 기존 동작 유지.
                                .contextMenu {
                                    Button(role: .destructive) {
                                        profileToDelete = profile
                                    } label: {
                                        Label("삭제", systemImage: "trash")
                                    }
                                }
                            }

                            Button {
                                isCreating = true
                            } label: {
                                AddProfileCard()
                            }
                            .buttonStyle(.plain)
                        }
                        .padding(.horizontal, 20)
                        .padding(.bottom, 32)
                    }
                }
            }
        }
        .task {
            // HomeRouter가 이미 prefetch하지만, 첫 진입에서 아직 load되지 않은 상태라면 한 번 더 보장.
            // 첫 로그인 흐름에서도 OnboardingView를 강제로 띄우지 않는다 — 사용자가 직접 "프로필 추가"
            // 카드를 선택할 때까지 기다린다. 강제 모달은 가족 단위 서비스에서 부담스럽다는 피드백 반영.
            if viewModel.profiles.isEmpty && !viewModel.isLoading {
                await viewModel.load()
            }
        }
        .sheet(isPresented: $isCreating) {
            CreateProfileSheet(viewModel: viewModel, isPresented: $isCreating)
        }
        .confirmationDialog(
            "프로필을 삭제할까요?",
            isPresented: Binding(
                get: { profileToDelete != nil },
                set: { if !$0 { profileToDelete = nil } },
            ),
            titleVisibility: .visible,
            presenting: profileToDelete,
        ) { profile in
            Button("삭제", role: .destructive) {
                Task {
                    Haptic.play(.warning)
                    await viewModel.delete(profile: profile)
                }
                profileToDelete = nil
            }
            Button("취소", role: .cancel) {
                profileToDelete = nil
            }
        } message: { profile in
            Text("\(profile.name) 프로필이 목록에서 사라져요. 만든 책과 학습 기록은 보존돼요.")
        }
    }

    /// 프로필이 한 명도 없을 때 — "프로필 추가" 카드만 가운데에 큰 비중으로.
    /// 이전 강제 OnboardingView 대신 사용자가 직접 시작 시점을 선택할 수 있게.
    private var emptyState: some View {
        VStack(spacing: 20) {
            Spacer()
            Image(systemName: "person.crop.circle.badge.plus")
                .font(.system(size: 64, weight: .light))
                .foregroundStyle(Color.smapPrimary)
            VStack(spacing: 6) {
                Text("첫 프로필을 추가해 주세요")
                    .font(Font.atozBold(20))
                    .foregroundStyle(Color.smapText)
                Text("아이의 이름과 나이를 알려주면\n그에 맞는 영어 동화를 만들어 드려요.")
                    .font(Font.atozRegular(15))
                    .foregroundStyle(Color.smapMuted)
                    .multilineTextAlignment(.center)
            }
            Button {
                isCreating = true
            } label: {
                HStack(spacing: 8) {
                    Image(systemName: "plus")
                        .font(.system(size: 16, weight: .bold))
                    Text("프로필 추가")
                        .font(Font.atozBold(16))
                }
                .padding(.horizontal, 28)
                .frame(height: 52)
                .background(Color.smapPrimary)
                .foregroundStyle(Color.smapPrimaryForeground)
                .clipShape(Capsule())
            }
            .buttonStyle(.plain)
            Spacer()
        }
        .padding(.horizontal, 32)
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
