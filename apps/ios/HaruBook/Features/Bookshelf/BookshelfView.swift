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

            ScrollView {
                VStack(alignment: .leading, spacing: 18) {
                    // 1행: 타이틀 + 부제 (좌측) + 둥근 아이콘 액션 2개(우측)
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

                    // 2행: 새 동화 만들기(주요 CTA, full-width) + 별 잔액 카드(우측)
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
                            .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
                        }
                        .buttonStyle(.plain)

                        NavigationLink(value: StoreDestination()) {
                            CreditBadge(balance: viewModel.credits?.balance)
                        }
                        .buttonStyle(.plain)
                    }

                    LevelFilterView(
                        selectedCefr: Binding(
                            get: { viewModel.cefrFilter },
                            set: { viewModel.cefrFilter = $0 }
                        ),
                        onChange: { Task { await viewModel.load() } }
                    )

                    content
                }
                .padding(.horizontal, 20)
                .padding(.top, 16)
                .padding(.bottom, 32)
            }
        }
        .navigationBarTitleDisplayMode(.inline)
        .task {
            async let books: Void = viewModel.load()
            async let credits: Void = viewModel.fetchCredits()
            _ = await (books, credits)
        }
        .refreshable {
            async let books: Void = viewModel.load()
            async let credits: Void = viewModel.fetchCredits()
            _ = await (books, credits)
        }
    }

    @ViewBuilder
    private var content: some View {
        if viewModel.isLoading && viewModel.books.isEmpty {
            VStack(spacing: 16) {
                ProgressView().tint(Color.smapPrimary)
                Text("책을 불러오는 중…")
                    .font(.smapCaption)
                    .foregroundStyle(Color.smapMuted)
            }
            .frame(maxWidth: .infinity)
            .padding(.top, 64)
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
            .padding(.top, 48)
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
            .padding(.top, 48)
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
