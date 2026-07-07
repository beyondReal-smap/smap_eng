import SwiftUI

/// 학습 통계 화면 — 웹 `stats-dashboard.tsx` 미러.
///
/// 누적 성취 / 레벨별 분포 / 월간 흔적 / 단어장 현황 / 최근 퀴즈 5가지 섹션.
/// 보호자 PIN 없이 아이도 볼 수 있는 영역(보호자 전용 리포트는 `/parents`).
struct StatsDashboardView: View {
    @State private var viewModel: StatsViewModel

    init(profileId: Int) {
        _viewModel = State(initialValue: StatsViewModel(profileId: profileId))
    }

    var body: some View {
        ZStack {
            Color.smapBackground.ignoresSafeArea()

            // 설정 화면과 동일하게 헤더를 ScrollView 바깥의 상단 고정 영역에 배치 — 스크롤 시에도
            // 어떤 화면인지 명확히 보이도록.
            VStack(alignment: .leading, spacing: 0) {
                header
                    .padding(.horizontal, 20)
                    .padding(.top, 16)
                    .padding(.bottom, 12)

                contentRegion
            }
        }
        .toolbar(.hidden, for: .navigationBar)
        .task { await viewModel.load() }
    }

    /// 헤더 아래 본문 영역 — 로딩/에러/empty/실제 통계 분기. 헤더는 상단 고정이라 이 안에 포함 안 함.
    @ViewBuilder
    private var contentRegion: some View {
        if viewModel.isLoading && viewModel.summary == nil {
            Spacer(minLength: 0)
            ProgressView().tint(Color.smapPrimary)
                .frame(maxWidth: .infinity)
            Spacer(minLength: 0)
        } else if let error = viewModel.error, viewModel.summary == nil {
            Spacer(minLength: 0)
            errorState(message: error)
            Spacer(minLength: 0)
        } else if viewModel.summary == nil {
            Spacer(minLength: 0)
            emptyError(message: "아직 학습 기록이 없어요. 책을 한 권 읽고 다시 와 주세요.")
            Spacer(minLength: 0)
        } else {
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    summarySection
                    pointsSection
                    levelSection
                    monthlySection
                    vocabSection
                    recentQuizSection
                }
                .padding(.horizontal, 20)
                .padding(.bottom, 32)
            }
        }
    }

    private var header: some View {
        // 책장/단어장/설정과 동일한 헤더 톤. 외부 padding(.top:16)만 사용 — 헤더 자체에 추가 top 두지 않는다.
        VStack(alignment: .leading, spacing: 4) {
            Text("학습 통계")
                .font(Font.atozBlack(34))
                .foregroundStyle(Color.smapText)
            Text("아이의 영어 학습 흐름을 한눈에 봐요")
                .font(Font.atozRegular(15))
                .foregroundStyle(Color.smapMuted)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    // MARK: - 누적 성취

    private var summarySection: some View {
        VStack(alignment: .leading, spacing: 12) {
            sectionTitle("누적 성취")
            LazyVGrid(
                columns: Array(repeating: GridItem(.flexible(), spacing: 10), count: 2),
                spacing: 10,
            ) {
                bigStat(label: "읽은 책", value: viewModel.summary?.totalBooksRead ?? 0, unit: "권")
                bigStat(label: "완독 세션", value: viewModel.summary?.totalFinishedSessions ?? 0, unit: "회")
                bigStat(label: "만점", value: viewModel.summary?.totalPerfectScores ?? 0, unit: "회")
                bigStat(
                    label: "평균 정답률",
                    value: Int(((viewModel.summary?.averageAccuracy ?? 0) * 100).rounded()),
                    unit: "%",
                )
            }
        }
    }

    // MARK: - 모은 포인트

    /// 누적 포인트 + 획득 배지 카드 — 웹 `points-card.tsx` 미러.
    /// "압박 없는" 톤: 이미 획득한 것만 보여준다(미획득 배지·다음 조건 미표시).
    /// 포인트 0 + 배지 0이면 카드 자체 미노출(결핍 강조 방지).
    @ViewBuilder
    private var pointsSection: some View {
        if let summary = viewModel.summary {
            let stats = summary.rewardStats
            let points = Rewards.computePoints(stats)
            let badges = Rewards.earnedBadges(stats)
            if points > 0 || !badges.isEmpty {
                VStack(alignment: .leading, spacing: 12) {
                    HStack(alignment: .top, spacing: 10) {
                        ZStack {
                            Circle().fill(Color.smapGold.opacity(0.35))
                            Image(systemName: "medal.fill")
                                .font(.system(size: 15, weight: .bold))
                                // smapGold는 배경용 파스텔 — 아이콘은 진한 골드 잉크(단어장 Lv 칩과 동일 계열).
                                .foregroundStyle(Color(hex: 0x8A6300))
                        }
                        .frame(width: 36, height: 36)

                        VStack(alignment: .leading, spacing: 2) {
                            Text("모은 포인트")
                                .font(.smapHeading)
                                .foregroundStyle(Color.smapText)
                            Text("읽고, 풀고, 외울 때마다 쌓여요")
                                .font(.smapCaption)
                                .foregroundStyle(Color.smapMuted)
                        }

                        Spacer(minLength: 8)

                        Text("\(points)P")
                            .font(Font.atozBold(15))
                            .monospacedDigit()
                            .foregroundStyle(Color.smapPrimaryForeground)
                            .padding(.horizontal, 10)
                            .padding(.vertical, 5)
                            .background(Color.smapPrimarySoft, in: Capsule())
                    }

                    if !badges.isEmpty {
                        LazyVGrid(
                            columns: [GridItem(.adaptive(minimum: 100), spacing: 6)],
                            alignment: .leading,
                            spacing: 6,
                        ) {
                            ForEach(badges) { badge in
                                HStack(spacing: 4) {
                                    Text(badge.emoji)
                                        .font(.system(size: 12))
                                    Text(badge.title)
                                        .font(Font.atozBold(12))
                                        .foregroundStyle(Color.smapText)
                                        .lineLimit(1)
                                }
                                .padding(.horizontal, 10)
                                .padding(.vertical, 6)
                                .frame(maxWidth: .infinity)
                                .background(Color.smapBackground, in: Capsule())
                                .overlay(Capsule().stroke(Color.smapBorder, lineWidth: 1))
                                .accessibilityLabel("\(badge.title) — \(badge.description)")
                            }
                        }
                    }
                }
                .padding(16)
                .background(Color.smapSurface)
                .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
                .overlay(
                    RoundedRectangle(cornerRadius: 16, style: .continuous)
                        .stroke(Color.smapBorder, lineWidth: 1),
                )
            }
        }
    }

    // MARK: - 레벨별 분포

    private var levelSection: some View {
        let rows = viewModel.levelStats()
        let maxCount = max(1, rows.map(\.count).max() ?? 1)
        return VStack(alignment: .leading, spacing: 12) {
            sectionTitle("레벨별 독서량")
            VStack(spacing: 12) {
                ForEach(rows) { row in
                    HStack(spacing: 12) {
                        Text(row.level.rawValue)
                            .font(.smapBadge)
                            .padding(.horizontal, 10)
                            .padding(.vertical, 4)
                            .background(row.level.color)
                            .foregroundStyle(Color.smapText)
                            .clipShape(RoundedRectangle(cornerRadius: 6, style: .continuous))

                        GeometryReader { geo in
                            ZStack(alignment: .leading) {
                                RoundedRectangle(cornerRadius: 6, style: .continuous)
                                    .fill(Color.smapBorder.opacity(0.4))
                                RoundedRectangle(cornerRadius: 6, style: .continuous)
                                    .fill(row.level.color)
                                    .frame(width: geo.size.width * CGFloat(row.count) / CGFloat(maxCount))
                            }
                        }
                        .frame(height: 18)

                        Text(rowDescription(row))
                            .font(.smapCaption)
                            .foregroundStyle(Color.smapMuted)
                            .lineLimit(1)
                    }
                }
            }
            .padding(16)
            .background(Color.smapSurface)
            .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 16, style: .continuous)
                    .stroke(Color.smapBorder, lineWidth: 1),
            )
        }
    }

    private func rowDescription(_ row: StatsViewModel.LevelRow) -> String {
        var s = "\(row.count)권 · 완독 \(row.finished)"
        if let avg = row.avgAccuracy {
            s += " · \(Int((avg * 100).rounded()))%"
        }
        return s
    }

    // MARK: - 월간 흔적

    private var monthlySection: some View {
        VStack(alignment: .leading, spacing: 12) {
            sectionTitle("이번 달 학습")
            MonthlyFootprintView(
                activeDays: viewModel.summary?.activeDaysThisMonth ?? [],
                thisMonth: viewModel.summary?.thisMonth ?? "",
            )
        }
    }

    // MARK: - 단어장 현황

    private var vocabSection: some View {
        let v = viewModel.vocabBreakdown()
        return VStack(alignment: .leading, spacing: 12) {
            sectionTitle("단어장")
            LazyVGrid(
                columns: Array(repeating: GridItem(.flexible(), spacing: 10), count: 2),
                spacing: 10,
            ) {
                bigStat(label: "누적", value: v.total, unit: "개")
                bigStat(label: "아직 안 본 단어", value: v.fresh, unit: "개")
                bigStat(label: "모르는 단어", value: v.unknown, unit: "개", highlight: .danger)
                bigStat(label: "학습 중", value: v.mastering, unit: "개")
            }
        }
    }

    // MARK: - 최근 퀴즈

    private var recentQuizSection: some View {
        let titleById = Dictionary(uniqueKeysWithValues: viewModel.books.map { ($0.id, $0) })
        let rows: [(book: Book, score: Int, startedAt: Int)] = viewModel.stats
            .compactMap { id, s in
                guard let book = titleById[id], let q = s.quizScore else { return nil }
                return (book: book, score: q, startedAt: s.startedAtUnix)
            }
            .sorted { $0.startedAt > $1.startedAt }
            .prefix(8)
            .map { $0 }

        return VStack(alignment: .leading, spacing: 12) {
            sectionTitle("최근 퀴즈")
            if rows.isEmpty {
                Text("아직 평가된 퀴즈가 없어요.")
                    .font(.smapCaption)
                    .foregroundStyle(Color.smapMuted)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(.vertical, 12)
            } else {
                VStack(spacing: 0) {
                    ForEach(Array(rows.enumerated()), id: \.offset) { idx, row in
                        recentQuizRow(book: row.book, score: row.score)
                        if idx < rows.count - 1 {
                            Divider().padding(.leading, 12)
                        }
                    }
                }
                .background(Color.smapSurface)
                .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
                .overlay(
                    RoundedRectangle(cornerRadius: 16, style: .continuous)
                        .stroke(Color.smapBorder, lineWidth: 1),
                )
            }
        }
    }

    private func recentQuizRow(book: Book, score: Int) -> some View {
        HStack(spacing: 12) {
            Text(book.cefr.rawValue)
                .font(.smapBadge)
                .padding(.horizontal, 8)
                .padding(.vertical, 3)
                .background(book.cefr.color)
                .clipShape(RoundedRectangle(cornerRadius: 6, style: .continuous))
            Text(book.title)
                .font(.smapBody)
                .foregroundStyle(Color.smapText)
                .lineLimit(1)
            Spacer()
            Text("\(score)/5")
                .font(.smapBodyEmphasis)
                .foregroundStyle(score == 5 ? Color.smapPrimary : Color.smapText)
        }
        .padding(12)
    }

    // MARK: - Helpers

    private func sectionTitle(_ s: String) -> some View {
        Text(s).font(.smapHeading).foregroundStyle(Color.smapText)
    }

    private enum StatHighlight { case none, danger }

    private func bigStat(label: String, value: Int, unit: String, highlight: StatHighlight = .none) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(label)
                .font(.smapCaption)
                .foregroundStyle(Color.smapMuted)
            HStack(alignment: .firstTextBaseline, spacing: 4) {
                Text("\(value)")
                    .font(.smapTitle)
                    .foregroundStyle(highlight == .danger && value > 0 ? Color.smapDanger : Color.smapText)
                Text(unit)
                    .font(.smapCaption)
                    .foregroundStyle(Color.smapMuted)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(14)
        .background(Color.smapSurface)
        .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 14, style: .continuous)
                .stroke(Color.smapBorder, lineWidth: 1),
        )
    }

    private func emptyError(message: String) -> some View {
        VStack(spacing: 16) {
            Image(systemName: "chart.bar.xaxis")
                .font(.system(size: 56))
                .foregroundStyle(Color.smapMuted)
            Text(message)
                .font(.smapBody)
                .foregroundStyle(Color.smapMuted)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 32)
        }
    }

    private func errorState(message: String) -> some View {
        VStack(spacing: 16) {
            Image(systemName: "exclamationmark.triangle")
                .font(.system(size: 48))
                .foregroundStyle(Color.smapDanger)
            Text(message)
                .font(.smapBody)
                .foregroundStyle(Color.smapDanger)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 32)
            PrimaryButton(title: "다시 시도", variant: .tonal) {
                Task { await viewModel.load() }
            }
            .padding(.horizontal, 32)
        }
    }
}
