import SwiftUI

struct ReaderView: View {
    @State private var viewModel: ReaderViewModel
    @State private var audio = AudioPlayer.shared

    init(book: Book, profileId: Int) {
        _viewModel = State(initialValue: ReaderViewModel(book: book, profileId: profileId))
    }

    var body: some View {
        ZStack {
            Color.smapBackground.ignoresSafeArea()

            VStack(spacing: 0) {
                header

                if viewModel.isLoadingDetail {
                    Spacer()
                    ProgressView().tint(Color.smapPrimary)
                    Spacer()
                } else if let error = viewModel.error {
                    Spacer()
                    Text(error)
                        .font(.smapBody)
                        .foregroundStyle(Color.smapDanger)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal, 24)
                    Spacer()
                } else if viewModel.passages.isEmpty {
                    Spacer()
                    Text("아직 문장이 준비되지 않았습니다.")
                        .font(.smapBody)
                        .foregroundStyle(Color.smapMuted)
                    Spacer()
                } else {
                    pagedContent
                    bottomBar
                }
            }
        }
        .navigationBarTitleDisplayMode(.inline)
        .toolbar { ToolbarItem(placement: .principal) { Text(viewModel.book.title).font(.smapBodyEmphasis) } }
        .task { await viewModel.bootstrap() }
        .onDisappear { Task { await viewModel.leave() } }
    }

    private var header: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack(spacing: 10) {
                BadgeLabel(text: "\(viewModel.book.age)세", tone: .neutral)
                BadgeLabel(text: viewModel.book.cefr.label, tone: .primary)
                Spacer()
                if !viewModel.passages.isEmpty {
                    Text("\(viewModel.currentIndex + 1) / \(viewModel.passages.count)")
                        .font(.smapCaption)
                        .foregroundStyle(Color.smapMuted)
                }
            }

            ProgressView(
                value: Double(viewModel.currentIndex + 1),
                total: Double(max(viewModel.passages.count, 1))
            )
            .tint(Color.smapPrimary)
            .opacity(viewModel.passages.isEmpty ? 0 : 1)
        }
        .padding(.horizontal, 24)
        .padding(.top, 12)
    }

    private var pagedContent: some View {
        TabView(
            selection: Binding(
                get: { viewModel.currentIndex },
                set: { newValue in
                    Task { await viewModel.reportPageChanged(to: newValue) }
                }
            )
        ) {
            ForEach(Array(viewModel.passages.enumerated()), id: \.offset) { index, passage in
                let isPlaying = audio.nowPlayingPassageId == passage.id
                let isPreparing = audio.preparingPassageId == passage.id
                    || viewModel.synthesizingPassageId == passage.id
                let isGeneratingScene = viewModel.generatingScenePassageId == passage.id
                PassageView(
                    passage: passage,
                    showsKorean: viewModel.showsKorean,
                    isPlaying: isPlaying,
                    isPreparing: isPreparing,
                    isGeneratingScene: isGeneratingScene,
                    onTogglePlayback: {
                        Task { await viewModel.togglePlayback(for: index) }
                    },
                    onRequestScene: {
                        Task { await viewModel.requestSceneImage(for: index) }
                    }
                )
                .tag(index)
            }
        }
        .tabViewStyle(.page(indexDisplayMode: .never))
        .indexViewStyle(.page(backgroundDisplayMode: .never))
    }

    @ViewBuilder
    private var bottomBar: some View {
        let isLastPage = viewModel.currentIndex + 1 >= viewModel.passages.count

        HStack(spacing: 12) {
            Button {
                viewModel.toggleKorean()
            } label: {
                Label(
                    viewModel.showsKorean ? "한글 끄기" : "한글 보기",
                    systemImage: viewModel.showsKorean ? "character.book.closed.fill" : "character.book.closed"
                )
                .font(.smapCaption)
                .padding(.horizontal, 14)
                .padding(.vertical, 10)
                .background(viewModel.showsKorean ? Color.smapPrimary : Color.smapSurface)
                .foregroundStyle(viewModel.showsKorean ? .white : Color.smapText)
                .clipShape(Capsule())
                .overlay(
                    Capsule().stroke(Color.smapBorder, lineWidth: viewModel.showsKorean ? 0 : 1)
                )
            }
            .buttonStyle(.plain)

            Spacer()

            if isLastPage {
                NavigationLink(value: QuizDestination(book: viewModel.book, readingLogId: viewModel.readingLogId)) {
                    HStack(spacing: 6) {
                        Image(systemName: "questionmark.circle.fill")
                        Text("퀴즈 풀기").font(.smapBodyEmphasis)
                    }
                    .padding(.horizontal, 18)
                    .padding(.vertical, 12)
                    .background(Color.smapPrimary, in: Capsule())
                    .foregroundStyle(.white)
                }
            } else {
                Button {
                    if viewModel.currentIndex > 0 {
                        Task { await viewModel.reportPageChanged(to: viewModel.currentIndex - 1) }
                    }
                } label: {
                    Image(systemName: "chevron.left")
                        .font(.smapHeading)
                        .padding(12)
                        .background(Color.smapSurface)
                        .foregroundStyle(Color.smapText)
                        .clipShape(Circle())
                        .overlay(Circle().stroke(Color.smapBorder, lineWidth: 1))
                }
                .buttonStyle(.plain)
                .disabled(viewModel.currentIndex == 0)

                Button {
                    let next = viewModel.currentIndex + 1
                    if next < viewModel.passages.count {
                        Task { await viewModel.reportPageChanged(to: next) }
                    }
                } label: {
                    Image(systemName: "chevron.right")
                        .font(.smapHeading)
                        .padding(12)
                        .background(Color.smapPrimary)
                        .foregroundStyle(.white)
                        .clipShape(Circle())
                }
                .buttonStyle(.plain)
            }
        }
        .padding(.horizontal, 20)
        .padding(.vertical, 16)
        .background(.ultraThinMaterial)
    }
}

/// `NavigationStack(path:)` 의 destination value.
struct QuizDestination: Hashable {
    let book: Book
    let readingLogId: Int?
}
