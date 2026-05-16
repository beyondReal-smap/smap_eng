import SwiftUI

/// 단어장 메인 화면 — 3탭(오늘/모르는/전체) + 플래시카드 + SRS 평가.
struct VocabDeckView: View {
    @State private var viewModel: VocabViewModel

    init(profileId: Int) {
        _viewModel = State(initialValue: VocabViewModel(profileId: profileId))
    }

    var body: some View {
        ZStack {
            Color.smapBackground.ignoresSafeArea()

            if viewModel.isLoading && viewModel.entries.isEmpty {
                ProgressView().tint(Color.smapPrimary)
            } else if viewModel.entries.isEmpty {
                emptyState
            } else {
                content
            }
        }
        .toolbar(.hidden, for: .navigationBar)
        .task { await viewModel.load() }
    }

    private var pageHeader: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text("단어장")
                .font(Font.atozBlack(34))
                .foregroundStyle(Color.smapText)
            Text("매일 만나는 영어 단어를 차곡차곡")
                .font(Font.atozRegular(15))
                .foregroundStyle(Color.smapMuted)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private var content: some View {
        VStack(spacing: 16) {
            pageHeader
            tabBar

            let deck = viewModel.deck
            if deck.isEmpty {
                Spacer()
                emptyTab
                Spacer()
            } else {
                progressBar(current: viewModel.index, total: deck.count)
                    .padding(.horizontal, 4)

                if let entry = viewModel.current {
                    VocabCardView(
                        entry: entry,
                        isFlipped: viewModel.isFlipped,
                        isSpeaking: viewModel.isSpeaking,
                        onSpeak: { Task { await viewModel.speak(entry.word) } },
                        onFlip: { viewModel.flip() },
                    )
                    .padding(.horizontal, 4)
                }

                if (viewModel.tab == .review || viewModel.tab == .unknown) && viewModel.isFlipped {
                    gradeButtons
                } else {
                    navButtons
                }

                Spacer(minLength: 0)
            }
        }
        .padding(.horizontal, 20)
        .padding(.vertical, 16)
    }

    // MARK: - Tabs

    private var tabBar: some View {
        HStack(spacing: 8) {
            ForEach(VocabViewModel.Tab.allCases) { t in
                Button {
                    withAnimation(.easeInOut(duration: 0.2)) { viewModel.tab = t }
                } label: {
                    HStack(spacing: 6) {
                        Text(t.label)
                            .font(Font.atozBold(14))
                            .lineLimit(1)
                            .fixedSize(horizontal: true, vertical: false)
                        if let badge = badgeCount(for: t), badge > 0 {
                            Text("\(badge)")
                                .font(Font.atozBold(11))
                                .padding(.horizontal, 7)
                                .padding(.vertical, 2)
                                .background(viewModel.tab == t ? Color.white.opacity(0.25) : Color.smapPrimarySoft)
                                .foregroundStyle(viewModel.tab == t ? Color.white : Color.smapPrimaryForeground)
                                .clipShape(Capsule())
                        }
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.horizontal, 14)
                    .padding(.vertical, 10)
                    .background(viewModel.tab == t ? Color.smapPrimary : Color.smapSurface)
                    .foregroundStyle(viewModel.tab == t ? Color.smapPrimaryForeground : Color.smapText)
                    .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                    .overlay(
                        RoundedRectangle(cornerRadius: 12, style: .continuous)
                            .stroke(Color.smapBorder, lineWidth: viewModel.tab == t ? 0 : 1),
                    )
                }
                .buttonStyle(.plain)
            }
        }
    }

    private func badgeCount(for tab: VocabViewModel.Tab) -> Int? {
        switch tab {
        case .review: return viewModel.dueCount
        case .unknown: return viewModel.unknownCount
        case .all: return viewModel.entries.count
        }
    }

    // MARK: - Progress

    private func progressBar(current: Int, total: Int) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack {
                Text("\(current + 1) / \(total)")
                    .font(.smapCaption)
                    .foregroundStyle(Color.smapMuted)
                Spacer()
                Button {
                    viewModel.shuffle()
                } label: {
                    Label("섞기", systemImage: "shuffle")
                        .font(.smapCaption)
                        .foregroundStyle(Color.smapPrimary)
                }
                .buttonStyle(.plain)
            }
            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    RoundedRectangle(cornerRadius: 3, style: .continuous)
                        .fill(Color.smapBorder.opacity(0.4))
                    RoundedRectangle(cornerRadius: 3, style: .continuous)
                        .fill(Color.smapPrimary)
                        .frame(
                            width: geo.size.width
                                * CGFloat(current + 1)
                                / CGFloat(Swift.max(1, total)),
                        )
                }
            }
            .frame(height: 6)
        }
    }

    // MARK: - Grade / Nav buttons

    private var gradeButtons: some View {
        HStack(spacing: 12) {
            PrimaryButton(title: "몰라요", variant: .outline) {
                viewModel.grade(.again)
            }
            PrimaryButton(title: "알아요", variant: .filled) {
                viewModel.grade(.good)
            }
        }
    }

    private var navButtons: some View {
        HStack(spacing: 12) {
            PrimaryButton(title: "이전", variant: .outline) {
                viewModel.go(-1)
            }
            PrimaryButton(title: "다음", variant: .filled) {
                viewModel.go(1)
            }
        }
    }

    // MARK: - Empty states

    private var emptyState: some View {
        VStack(spacing: 16) {
            Image(systemName: "books.vertical")
                .font(.system(size: 56))
                .foregroundStyle(Color.smapMuted)
            Text("아직 모은 단어가 없어요")
                .font(.smapHeading)
                .foregroundStyle(Color.smapText)
            Text("책을 만들고 읽어 보면 단어가 여기에 쌓여요.")
                .font(.smapBody)
                .foregroundStyle(Color.smapMuted)
                .multilineTextAlignment(.center)
        }
        .padding(.horizontal, 32)
    }

    private var emptyTab: some View {
        VStack(spacing: 8) {
            Image(systemName: "checkmark.circle")
                .font(.system(size: 40))
                .foregroundStyle(Color.smapPrimary)
            Text(emptyTabHeadline)
                .font(.smapBodyEmphasis)
                .foregroundStyle(Color.smapText)
            Text(emptyTabSubline)
                .font(.smapCaption)
                .foregroundStyle(Color.smapMuted)
                .multilineTextAlignment(.center)
        }
        .padding(.horizontal, 32)
    }

    private var emptyTabHeadline: String {
        switch viewModel.tab {
        case .review: return "오늘 학습할 단어가 없어요"
        case .unknown: return "다시 볼 단어가 없어요"
        case .all: return "단어가 없어요"
        }
    }

    private var emptyTabSubline: String {
        switch viewModel.tab {
        case .review: return "잠시 쉬거나 '전체' 탭에서 다시 훑어 보세요."
        case .unknown: return "'모르겠다'고 표시한 단어가 모이면 여기에 나타나요."
        case .all: return "책을 더 읽으면 단어가 쌓여요."
        }
    }
}
