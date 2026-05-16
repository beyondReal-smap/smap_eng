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
                textScaleMenu
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

    /// 본문 텍스트 크기 4단계 선택 메뉴. 헤더 우측 끝의 작은 Aa 아이콘으로 노출.
    private var textScaleMenu: some View {
        Menu {
            Picker("본문 크기", selection: Binding(
                get: { viewModel.textScale },
                set: { viewModel.textScale = $0 }
            )) {
                ForEach(ReaderTextScale.allCases) { scale in
                    Text(scale.label).tag(scale)
                }
            }
        } label: {
            HStack(spacing: 2) {
                Image(systemName: "textformat.size")
                    .font(.system(size: 13, weight: .semibold))
            }
            .frame(width: 30, height: 28)
            .foregroundStyle(Color.smapText)
            .background(Color.smapSurface)
            .clipShape(Capsule())
            .overlay(Capsule().stroke(Color.smapBorder, lineWidth: 1))
        }
        .accessibilityLabel("본문 텍스트 크기")
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
                PassageView(
                    passage: passage,
                    vocabulary: viewModel.book.vocabulary ?? [],
                    showsKorean: viewModel.showsKorean,
                    isPlaying: isPlaying,
                    textScale: viewModel.textScale,
                )
                .tag(index)
            }
        }
        .tabViewStyle(.page(indexDisplayMode: .never))
        .indexViewStyle(.page(backgroundDisplayMode: .never))
    }

    /// 하단 통합 컨트롤바: [← 이전] [▶︎ 듣기] [Aa 한글] [다음 → / 퀴즈]
    /// 메인 액션(듣기)은 가장 눈에 띄는 primary 캡슐. 보조 토글(한글)은 surface 캡슐.
    /// 페이지 네비게이션은 원형 보조 버튼으로 좌우 끝에 둔다.
    @ViewBuilder
    private var bottomBar: some View {
        let isLastPage = viewModel.currentIndex + 1 >= viewModel.passages.count
        let passage = viewModel.passages[viewModel.currentIndex]
        let isPlaying = audio.nowPlayingPassageId == passage.id
        let isPreparing = audio.preparingPassageId == passage.id
            || viewModel.synthesizingPassageId == passage.id

        HStack(spacing: 10) {
            previousButton

            listenButton(isPlaying: isPlaying, isPreparing: isPreparing)

            koreanToggle

            if isLastPage {
                quizButton
            } else {
                nextButton
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
        .background(.ultraThinMaterial)
    }

    private var previousButton: some View {
        Button {
            if viewModel.currentIndex > 0 {
                Task { await viewModel.reportPageChanged(to: viewModel.currentIndex - 1) }
            }
        } label: {
            Image(systemName: "chevron.left")
                .font(.system(size: 17, weight: .semibold))
                .frame(width: 44, height: 44)
                .background(Color.smapSurface)
                .foregroundStyle(viewModel.currentIndex == 0 ? Color.smapMuted : Color.smapText)
                .clipShape(Circle())
                .overlay(Circle().stroke(Color.smapBorder, lineWidth: 1))
        }
        .buttonStyle(.plain)
        .disabled(viewModel.currentIndex == 0)
        .accessibilityLabel("이전 문장")
    }

    private var nextButton: some View {
        Button {
            let next = viewModel.currentIndex + 1
            if next < viewModel.passages.count {
                Task { await viewModel.reportPageChanged(to: next) }
            }
        } label: {
            Image(systemName: "chevron.right")
                .font(.system(size: 17, weight: .semibold))
                .frame(width: 44, height: 44)
                .background(Color.smapPrimary)
                .foregroundStyle(.white)
                .clipShape(Circle())
        }
        .buttonStyle(.plain)
        .accessibilityLabel("다음 문장")
    }

    private func listenButton(isPlaying: Bool, isPreparing: Bool) -> some View {
        Button {
            Task { await viewModel.togglePlayback(for: viewModel.currentIndex) }
        } label: {
            HStack(spacing: 6) {
                if isPreparing {
                    ProgressView().tint(.white).scaleEffect(0.8)
                } else {
                    Image(systemName: isPlaying ? "pause.fill" : "play.fill")
                        .font(.system(size: 14, weight: .semibold))
                }
                Text(isPlaying ? "일시정지" : (isPreparing ? "준비 중" : "듣기"))
                    .font(Font.atozBold(14))
            }
            .padding(.horizontal, 14)
            .frame(height: 44)
            .background(Color.smapPrimary)
            .foregroundStyle(.white)
            .clipShape(Capsule())
        }
        .buttonStyle(.plain)
        .accessibilityLabel(isPlaying ? "재생 일시정지" : "이 문장 듣기")
    }

    private var koreanToggle: some View {
        Button {
            viewModel.toggleKorean()
        } label: {
            HStack(spacing: 6) {
                Image(systemName: viewModel.showsKorean ? "character.book.closed.fill" : "character.book.closed")
                    .font(.system(size: 13, weight: .semibold))
                Text("한글")
                    .font(Font.atozBold(14))
            }
            .padding(.horizontal, 12)
            .frame(height: 44)
            .background(viewModel.showsKorean ? Color.smapPrimarySoft : Color.smapSurface)
            .foregroundStyle(viewModel.showsKorean ? Color.smapPrimary : Color.smapText)
            .clipShape(Capsule())
            .overlay(
                Capsule().stroke(
                    viewModel.showsKorean ? Color.smapPrimary.opacity(0.4) : Color.smapBorder,
                    lineWidth: 1,
                ),
            )
        }
        .buttonStyle(.plain)
        .accessibilityLabel(viewModel.showsKorean ? "한글 번역 끄기" : "한글 번역 보기")
    }

    private var quizButton: some View {
        NavigationLink(value: QuizDestination(book: viewModel.book, readingLogId: viewModel.readingLogId)) {
            HStack(spacing: 6) {
                Image(systemName: "questionmark.circle.fill")
                    .font(.system(size: 14, weight: .semibold))
                Text("퀴즈")
                    .font(Font.atozBold(14))
            }
            .padding(.horizontal, 14)
            .frame(height: 44)
            .background(Color.smapPrimary, in: Capsule())
            .foregroundStyle(.white)
        }
        .buttonStyle(.plain)
    }
}

/// `NavigationStack(path:)` 의 destination value.
struct QuizDestination: Hashable {
    let book: Book
    let readingLogId: Int?
}
