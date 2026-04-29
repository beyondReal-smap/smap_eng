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
                    HStack(alignment: .lastTextBaseline) {
                        VStack(alignment: .leading, spacing: 4) {
                            Text("책장")
                                .font(.smapDisplay)
                                .foregroundStyle(Color.smapText)
                            Text("읽고 싶은 책을 골라봐요")
                                .font(.smapBody)
                                .foregroundStyle(Color.smapMuted)
                        }
                        Spacer()
                        Button {
                            onSwitchProfile()
                        } label: {
                            Label("프로필 전환", systemImage: "arrow.triangle.2.circlepath")
                                .font(.smapCaption)
                                .padding(.horizontal, 12)
                                .padding(.vertical, 8)
                                .background(Color.smapSurface)
                                .foregroundStyle(Color.smapText)
                                .clipShape(Capsule())
                                .overlay(Capsule().stroke(Color.smapBorder, lineWidth: 1))
                        }
                        .buttonStyle(.plain)
                    }

                    LevelFilterView(
                        selectedAge: Binding(
                            get: { viewModel.ageFilter },
                            set: { viewModel.ageFilter = $0 }
                        ),
                        selectedCefr: Binding(
                            get: { viewModel.cefrFilter },
                            set: { viewModel.cefrFilter = $0 }
                        ),
                        onChange: { Task { await viewModel.load() } }
                    )

                    content
                }
                .padding(.horizontal, 20)
                .padding(.bottom, 32)
            }
        }
        .navigationBarTitleDisplayMode(.inline)
        .task { await viewModel.load() }
        .refreshable { await viewModel.load() }
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
                Text("웹에서 새 동화를 만들면 여기서 만나볼 수 있어요.")
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
