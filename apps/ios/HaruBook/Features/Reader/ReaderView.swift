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

    /// 하단 통합 컨트롤바.
    ///
    /// 4개의 균일한 캡슐을 한 줄에 배치 — 모두 같은 높이/너비로 묶어 단정한 느낌을 낸다.
    /// 색 위계로 위상 구분: primary(듣기/다음·퀴즈) vs tonal-toggle(한글) vs outline(이전).
    /// 상단에 얇은 Divider만 두고 배경은 단색 smapBackground — 머터리얼 블러가 책 본문과
    /// 충돌해 산만하게 보였던 문제 제거.
    @ViewBuilder
    private var bottomBar: some View {
        let isLastPage = viewModel.currentIndex + 1 >= viewModel.passages.count
        let passage = viewModel.passages[viewModel.currentIndex]
        let isPlaying = audio.nowPlayingPassageId == passage.id
        let isPreparing = audio.preparingPassageId == passage.id
            || viewModel.synthesizingPassageId == passage.id

        VStack(spacing: 0) {
            Divider().background(Color.smapBorder)

            textScaleControl
                .padding(.horizontal, 14)
                .padding(.top, 10)

            HStack(spacing: 8) {
                previousButton
                listenButton(isPlaying: isPlaying, isPreparing: isPreparing)
                koreanToggle
                if isLastPage {
                    quizButton
                } else {
                    nextButton
                }
            }
            .padding(.horizontal, 14)
            .padding(.top, 8)
            .padding(.bottom, 10)
        }
        .background(Color.smapBackground)
    }

    /// 텍스트 크기 4단계 선택기 — 각 버튼에 단계별로 다른 크기의 "A"를 표시해 시각적 미리보기 제공.
    /// 하단 컨트롤바 위에 한 줄로 배치 — 자주 토글하지 않는 보조 컨트롤이지만 본문 작성 중에도
    /// 즉시 닿을 수 있는 위치.
    private var textScaleControl: some View {
        HStack(spacing: 6) {
            Image(systemName: "textformat.size")
                .font(.system(size: 12, weight: .semibold))
                .foregroundStyle(Color.smapMuted)
                .padding(.trailing, 2)

            ForEach(ReaderTextScale.allCases) { scale in
                Button {
                    viewModel.textScale = scale
                } label: {
                    Text("A")
                        .font(Font.atozBold(scale.controlPreviewSize))
                        .frame(maxWidth: .infinity)
                        .frame(height: 34)
                        // Soft Coral Peach 위 .white는 WCAG 대비 1.7:1로 안 보임. 디자인 시스템 본래의
                        // deep coral ink(smapPrimaryForeground)를 사용해 5.2:1 대비 확보.
                        .foregroundStyle(viewModel.textScale == scale ? Color.smapPrimaryForeground : Color.smapText)
                        .background(viewModel.textScale == scale ? Color.smapPrimary : Color.smapSurface)
                        .clipShape(Capsule())
                        .overlay(
                            Capsule().stroke(
                                viewModel.textScale == scale ? Color.clear : Color.smapBorder,
                                lineWidth: 1,
                            ),
                        )
                }
                .buttonStyle(.plain)
                .accessibilityLabel("본문 크기 \(scale.label)")
            }
        }
    }

    /// 모든 컨트롤이 동일한 48pt 높이와 캡슐 모양을 공유 — 한 줄에서 일관된 시각 단위로 보이게.
    private static let controlHeight: CGFloat = 48

    private var previousButton: some View {
        let isDisabled = viewModel.currentIndex == 0
        return Button {
            if !isDisabled {
                Task { await viewModel.reportPageChanged(to: viewModel.currentIndex - 1) }
            }
        } label: {
            HStack(spacing: 4) {
                Image(systemName: "chevron.left")
                    .font(.system(size: 13, weight: .bold))
                Text("이전")
                    .font(Font.atozBold(14))
            }
            .frame(maxWidth: .infinity)
            .frame(height: Self.controlHeight)
            .foregroundStyle(isDisabled ? Color.smapMuted : Color.smapText)
            .background(isDisabled ? Color.smapSurface.opacity(0.5) : Color.smapSurface)
            .clipShape(Capsule())
            .overlay(Capsule().stroke(Color.smapBorder, lineWidth: 1))
        }
        .buttonStyle(.plain)
        .disabled(isDisabled)
        .accessibilityLabel("이전 문장")
    }

    private var nextButton: some View {
        Button {
            let next = viewModel.currentIndex + 1
            if next < viewModel.passages.count {
                Task { await viewModel.reportPageChanged(to: next) }
            }
        } label: {
            HStack(spacing: 4) {
                Text("다음")
                    .font(Font.atozBold(14))
                Image(systemName: "chevron.right")
                    .font(.system(size: 13, weight: .bold))
            }
            .frame(maxWidth: .infinity)
            .frame(height: Self.controlHeight)
            // 듣기/퀴즈와 같은 primary fill을 쓰면 컨트롤바에 코랄 톤이 과해진다.
            // 다음 이동은 자연스러운 흐름이지 강조 대상이 아니므로 tonal(primarySoft + primaryForeground)로 한 단계 낮춤.
            .foregroundStyle(Color.smapPrimaryForeground)
            .background(Color.smapPrimarySoft)
            .clipShape(Capsule())
            .overlay(Capsule().stroke(Color.smapPrimary.opacity(0.25), lineWidth: 1))
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
                    ProgressView().tint(Color.smapPrimaryForeground).scaleEffect(0.75)
                } else {
                    Image(systemName: isPlaying ? "pause.fill" : "play.fill")
                        .font(.system(size: 14, weight: .semibold))
                }
                Text(isPlaying ? "정지" : (isPreparing ? "준비" : "듣기"))
                    .font(Font.atozBold(14))
            }
            .frame(maxWidth: .infinity)
            .frame(height: Self.controlHeight)
            // WCAG 4.5:1 미달이던 흰글씨 → 디자인 시스템의 primaryForeground(deep coral ink)로 교정.
            .foregroundStyle(Color.smapPrimaryForeground)
            .background(Color.smapPrimary)
            .clipShape(Capsule())
        }
        .buttonStyle(.plain)
        .accessibilityLabel(isPlaying ? "재생 일시정지" : "이 문장 듣기")
    }

    private var koreanToggle: some View {
        Button {
            viewModel.toggleKorean()
        } label: {
            HStack(spacing: 4) {
                Image(systemName: viewModel.showsKorean ? "character.book.closed.fill" : "character.book.closed")
                    .font(.system(size: 13, weight: .semibold))
                Text("한글")
                    .font(Font.atozBold(14))
            }
            .frame(maxWidth: .infinity)
            .frame(height: Self.controlHeight)
            .foregroundStyle(viewModel.showsKorean ? Color.smapPrimary : Color.smapText)
            .background(viewModel.showsKorean ? Color.smapPrimarySoft : Color.smapSurface)
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
            .frame(maxWidth: .infinity)
            .frame(height: Self.controlHeight)
            .foregroundStyle(Color.smapPrimaryForeground)
            .background(Color.smapPrimary)
            .clipShape(Capsule())
        }
        .buttonStyle(.plain)
    }
}

/// `NavigationStack(path:)` 의 destination value.
struct QuizDestination: Hashable {
    let book: Book
    let readingLogId: Int?
}
