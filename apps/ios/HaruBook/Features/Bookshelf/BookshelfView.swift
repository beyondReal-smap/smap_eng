import SwiftUI

struct BookshelfView: View {
    @State private var viewModel: BookshelfViewModel
    let onSwitchProfile: () -> Void

    init(profileId: Int, onSwitchProfile: @escaping () -> Void) {
        _viewModel = State(initialValue: BookshelfViewModel(profileId: profileId))
        self.onSwitchProfile = onSwitchProfile
    }

    var body: some View {
        ZStack {
            Color.smapBackground.ignoresSafeArea()

            // 헤더/CTA/필터는 상단 고정. 책이 없거나 로딩/에러 상태에서는 ScrollView 없이
            // Spacer로 emptyState를 레벨필터 ~ 하단 탭바 사이 가운데에 배치.
            VStack(alignment: .leading, spacing: 18) {
                headerRow
                actionsRow
                LevelFilterView(
                    selectedCefr: Binding(
                        get: { viewModel.cefrFilter },
                        set: { viewModel.cefrFilter = $0 }
                    ),
                    onChange: { Task { await viewModel.load() } }
                )

                if viewModel.books.isEmpty {
                    // 가운데 정렬보다 약간 위 — 정중앙은 시각적으로 처지는 인상을 줘서, 위:아래 비율을
                    // 비대칭으로 조정해 자연스럽게 위쪽에 자리잡게 한다.
                    Color.clear.frame(height: 60)
                    content
                        .frame(maxWidth: .infinity)
                    Spacer(minLength: 0)
                } else {
                    ScrollView {
                        content
                            .padding(.bottom, 32)
                    }
                    .refreshable {
                        async let books: Void = viewModel.load()
                        async let credits: Void = viewModel.fetchCredits()
                        _ = await (books, credits)
                    }
                }
            }
            .padding(.horizontal, 20)
            .padding(.top, 16)
        }
        .navigationBarTitleDisplayMode(.inline)
        .task {
            async let books: Void = viewModel.load()
            async let credits: Void = viewModel.fetchCredits()
            _ = await (books, credits)
        }
    }

    private var headerRow: some View {
        HStack(alignment: .center, spacing: 12) {
            VStack(alignment: .leading, spacing: 4) {
                Text("책장")
                    .font(Font.atozBlack(34))
                    .foregroundStyle(Color.smapText)
                Text("읽고 싶은 책을 골라봐요")
                    .font(Font.atozRegular(15))
                    .foregroundStyle(Color.smapMuted)
            }
            Spacer()
            Button {
                onSwitchProfile()
            } label: {
                HStack(spacing: 6) {
                    Image(systemName: "person.2.fill")
                        .font(.system(size: 13, weight: .semibold))
                    Text("프로필 전환")
                        .font(Font.atozBold(14))
                }
                .padding(.horizontal, 14)
                .padding(.vertical, 10)
                .background(Color.smapSurface)
                .foregroundStyle(Color.smapText)
                .clipShape(Capsule())
                .overlay(Capsule().stroke(Color.smapBorder, lineWidth: 1))
            }
            .buttonStyle(.plain)
        }
    }

    /// 새 동화 만들기 + 별 잔액 — 옆의 CreditBadge / 위쪽 헤더의 "프로필 전환"이 모두 Capsule이라 통일.
    private var actionsRow: some View {
        HStack(spacing: 10) {
            NavigationLink(value: CreateBookDestination(profileId: viewModel.profileId)) {
                HStack(spacing: 8) {
                    Image(systemName: "plus.circle.fill")
                        .font(.system(size: 18, weight: .semibold))
                    Text("새 동화 만들기")
                        .font(Font.atozBold(16))
                }
                .frame(maxWidth: .infinity, minHeight: 48)
                .background(Color.smapPrimary)
                .foregroundStyle(Color.smapPrimaryForeground)
                .clipShape(Capsule())
            }
            .buttonStyle(.plain)

            NavigationLink(value: StoreDestination()) {
                CreditBadge(balance: viewModel.credits?.balance)
            }
            .buttonStyle(.plain)
        }
    }

    @ViewBuilder
    private var content: some View {
        if viewModel.isLoading && viewModel.books.isEmpty {
            // Spacer로 가운데 정렬되므로 추가 top padding 불필요.
            VStack(spacing: 16) {
                ProgressView().tint(Color.smapPrimary)
                Text("책을 불러오는 중…")
                    .font(.smapCaption)
                    .foregroundStyle(Color.smapMuted)
            }
            .frame(maxWidth: .infinity)
        } else if let error = viewModel.error, viewModel.books.isEmpty {
            VStack(spacing: 16) {
                Text(error)
                    .font(.smapBody)
                    .foregroundStyle(Color.smapDanger)
                    .multilineTextAlignment(.center)
                PrimaryButton(title: "다시 시도", variant: .tonal) {
                    Task { await viewModel.load() }
                }
            }
        } else if viewModel.books.isEmpty {
            VStack(spacing: 12) {
                Image(systemName: "books.vertical")
                    .font(.system(size: 56))
                    .foregroundStyle(Color.smapMuted)
                Text("아직 책이 없어요.")
                    .font(.smapBodyEmphasis)
                    .foregroundStyle(Color.smapText)
                Text("위의 \"새 동화 만들기\"를 눌러 첫 책을 만들어 보세요.")
                    .font(.smapCaption)
                    .foregroundStyle(Color.smapMuted)
                    .multilineTextAlignment(.center)
            }
            .frame(maxWidth: .infinity)
        } else {
            LazyVGrid(columns: [GridItem(.flexible(), spacing: 14), GridItem(.flexible(), spacing: 14)], spacing: 14) {
                ForEach(viewModel.books) { book in
                    NavigationLink(value: book) {
                        BookCardView(book: book)
                    }
                    .buttonStyle(.plain)
                }
            }
        }
    }
}

/// CreateBookFlow destination — NavigationStack value.
struct CreateBookDestination: Hashable {
    let profileId: Int
}
