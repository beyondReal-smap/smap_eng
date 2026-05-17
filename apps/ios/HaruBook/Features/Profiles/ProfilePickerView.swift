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
            // 장식 아이콘 — 아래 텍스트("첫 프로필을 추가해 주세요")가 동일한 정보를 전달하므로
            // 중복 발화 방지를 위해 VoiceOver 트리에서 숨김.
            Image(systemName: "person.crop.circle.badge.plus")
                .font(.system(size: 64, weight: .light))
                .foregroundStyle(Color.smapPrimary)
                .accessibilityHidden(true)
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
                // avatar(이모지)가 있으면 우선 표시, 없으면 이름 첫 글자 폴백.
                if let avatar = profile.avatar, !avatar.isEmpty {
                    Text(avatar)
                        .font(.system(size: 48))
                } else {
                    Text(String(profile.name.prefix(1)))
                        .font(.smapDisplay)
                        .foregroundStyle(Color.smapPrimary)
                }
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
        // VoiceOver는 기본적으로 avatar(이모지) Text와 이름 Text를 별도로 읽어 "🦊, 지우" 두 번
        // 발화. combine으로 한 셀로 묶고 자연스러운 라벨 부여. button trait는 외부 Button label로
        // 사용될 때 자동 부여되므로 추가 불필요.
        .accessibilityElement(children: .combine)
        .accessibilityLabel("\(profile.name) 프로필")
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
        // Image + Text 두 요소가 분리되어 "plus.circle.fill 이미지, 프로필 추가, 버튼"으로
        // 길게 발화됨. combine + 명시 라벨로 단순화. button trait은 외부 Button label에서 자동.
        .accessibilityElement(children: .combine)
        .accessibilityLabel("프로필 추가")
    }
}

private struct CreateProfileSheet: View {
    @Bindable var viewModel: ProfileViewModel
    @Binding var isPresented: Bool
    @State private var name: String = ""
    @State private var age: Int = 7   // 서버 default 와 동일한 기본값.
    @State private var avatar: String = "🦊"  // 첫 이모지 기본 선택.
    @State private var isSubmitting: Bool = false

    /// 어린이 친화 이모지 12종 — 동물 + 별/우주/하트. 서버 schema는 10자 이하 한도라 어떤 이모지든 OK.
    private static let avatarChoices: [String] = [
        "🦊", "🐰", "🐻", "🐼", "🦁", "🐯",
        "🐨", "🐶", "🐱", "🦄", "⭐️", "🌈",
    ]

    var body: some View {
        NavigationStack {
            VStack(spacing: 12) {
                ScrollView {
                    VStack(alignment: .leading, spacing: 20) {
                    VStack(alignment: .leading, spacing: 8) {
                        Text("이름")
                            .font(Font.atozBold(13))
                            .foregroundStyle(Color.smapMuted)
                        TextField("예: 지우", text: $name)
                            .font(.smapHeading)
                            .padding(14)
                            .background(Color.smapPrimarySoft)
                            .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
                            .submitLabel(.done)
                    }

                    VStack(alignment: .leading, spacing: 8) {
                        Text("나이")
                            .font(Font.atozBold(13))
                            .foregroundStyle(Color.smapMuted)
                        // 5~10세 가로 캡슐 — 책 생성 시 자녀 레벨 결정에 사용. 서버는 z.number().min(5).max(10).
                        HStack(spacing: 6) {
                            ForEach(5...10, id: \.self) { i in
                                Button {
                                    Haptic.play(.lightTap)
                                    age = i
                                } label: {
                                    Text("\(i)세")
                                        .font(Font.atozBold(14))
                                        .frame(maxWidth: .infinity)
                                        .frame(height: 40)
                                        .foregroundStyle(age == i ? Color.smapPrimaryForeground : Color.smapText)
                                        .background(age == i ? Color.smapPrimary : Color.smapSurface)
                                        .clipShape(Capsule())
                                        .overlay(
                                            Capsule().stroke(
                                                age == i ? Color.clear : Color.smapBorder,
                                                lineWidth: 1,
                                            ),
                                        )
                                }
                                .buttonStyle(.plain)
                            }
                        }
                    }

                    VStack(alignment: .leading, spacing: 8) {
                        Text("프로필 모양")
                            .font(Font.atozBold(13))
                            .foregroundStyle(Color.smapMuted)
                        // 6열 × 2행 그리드 — 어린이가 한눈에 고를 수 있게.
                        LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 8), count: 6), spacing: 8) {
                            ForEach(Self.avatarChoices, id: \.self) { emoji in
                                Button {
                                    Haptic.play(.lightTap)
                                    avatar = emoji
                                } label: {
                                    Text(emoji)
                                        .font(.system(size: 28))
                                        .frame(maxWidth: .infinity, minHeight: 52)
                                        .background(avatar == emoji ? Color.smapPrimarySoft : Color.smapSurface)
                                        .clipShape(Circle())
                                        .overlay(
                                            Circle().stroke(
                                                avatar == emoji ? Color.smapPrimary : Color.smapBorder,
                                                lineWidth: avatar == emoji ? 2 : 1,
                                            ),
                                        )
                                }
                                .buttonStyle(.plain)
                            }
                        }
                    }

                    if let error = viewModel.error {
                        Text(error)
                            .font(.smapCaption)
                            .foregroundStyle(Color.smapDanger)
                    }
                }
                    .padding(.bottom, 8)
                }

                PrimaryButton(
                    title: "추가하기",
                    variant: .filled,
                    isLoading: isSubmitting,
                    isEnabled: !name.trimmingCharacters(in: .whitespaces).isEmpty && !isSubmitting
                ) {
                    Task {
                        isSubmitting = true
                        viewModel.error = nil
                        await viewModel.create(name: name, age: age, avatar: avatar)
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
        .presentationDetents([.medium, .large])
    }
}
