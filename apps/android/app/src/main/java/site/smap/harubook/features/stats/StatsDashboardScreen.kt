package site.smap.harubook.features.stats

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.BarChart
import androidx.compose.material.icons.filled.MilitaryTech
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewmodel.compose.viewModel
import site.smap.harubook.R
import site.smap.harubook.core.rewards.BadgeDef
import site.smap.harubook.core.rewards.computePoints
import site.smap.harubook.core.rewards.earnedBadges
import site.smap.harubook.designsystem.PrimaryButton
import site.smap.harubook.designsystem.PrimaryButtonVariant
import site.smap.harubook.designsystem.SmapBackground
import site.smap.harubook.designsystem.SmapBadgeStyle
import site.smap.harubook.designsystem.SmapBodyEmphasisStyle
import site.smap.harubook.designsystem.SmapBodyStyle
import site.smap.harubook.designsystem.SmapBorder
import site.smap.harubook.designsystem.SmapCaptionStyle
import site.smap.harubook.designsystem.SmapDanger
import site.smap.harubook.designsystem.SmapDisplayStyle
import site.smap.harubook.designsystem.SmapGold
import site.smap.harubook.designsystem.SmapMuted
import site.smap.harubook.designsystem.SmapPrimary
import site.smap.harubook.designsystem.SmapPrimarySoft
import site.smap.harubook.designsystem.SmapSurface
import site.smap.harubook.designsystem.SmapText
import site.smap.harubook.designsystem.SmapTitleStyle
import site.smap.harubook.designsystem.tint

@Composable
fun StatsDashboardScreen(profileId: Int) {
    val viewModel: StatsViewModel = viewModel(
        key = "stats-$profileId",
        factory = remember(profileId) {
            object : ViewModelProvider.Factory {
                override fun <T : ViewModel> create(modelClass: Class<T>): T {
                    @Suppress("UNCHECKED_CAST")
                    return StatsViewModel(profileId) as T
                }
            }
        },
    )
    val state by viewModel.state.collectAsState()

    LaunchedEffect(profileId) { viewModel.load() }

    when {
        state.isLoading && state.summary == null -> CenteredStats { CircularProgressIndicator(color = SmapPrimary) }
        state.error != null && state.summary == null -> StatsError(message = state.error!!, onRetry = viewModel::load)
        state.summary == null -> StatsEmpty(stringResource(R.string.stats_empty))
        else -> StatsContent(state)
    }
}

@Composable
private fun StatsContent(state: StatsUiState) {
    val summary = state.summary!!
    // 포인트·배지 — 웹 rewards.ts 파생 집계. summary 가 바뀔 때만 재계산.
    val rewardPoints = remember(summary) { computePoints(summary) }
    val badges = remember(summary) { earnedBadges(summary) }
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(SmapBackground),
    ) {
        // iOS StatsDashboardView 패리티 — 헤더는 ScrollView 바깥에 두어 상단 고정.
        // 이전엔 LazyColumn 의 첫 item 으로 들어가 본문과 함께 스크롤되어 헤더가 사라졌다.
        Column(
            verticalArrangement = Arrangement.spacedBy(4.dp),
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 20.dp)
                .padding(top = 20.dp, bottom = 12.dp),
        ) {
            Text(stringResource(R.string.stats_title), style = SmapDisplayStyle, color = SmapText)
            Text(stringResource(R.string.stats_subtitle), style = SmapBodyStyle, color = SmapMuted)
        }

        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(horizontal = 20.dp),
            verticalArrangement = Arrangement.spacedBy(20.dp),
        ) {
        // 모은 포인트 + 획득 배지 — 웹 learning-summary PointsCard 패리티.
        // 획득한 것이 아무것도 없으면 카드 자체를 렌더하지 않는다(결핍 강조 방지).
        if (rewardPoints > 0 || badges.isNotEmpty()) {
            item {
                PointsCard(points = rewardPoints, badges = badges)
            }
        }
        // 누적 성취 — iOS 와 동일 4개 카드. 이전엔 섹션 제목이 빠져 있었다.
        item {
            SectionTitle(stringResource(R.string.stats_section_summary))
            Spacer(Modifier.height(8.dp))
            StatGrid(
                items = listOf(
                    stringResource(R.string.stats_books_read) to "${summary.totalBooksRead}권",
                    stringResource(R.string.stats_finished_sessions) to "${summary.totalFinishedSessions}회",
                    stringResource(R.string.stats_perfect_scores) to "${summary.totalPerfectScores}회",
                    stringResource(R.string.stats_avg_accuracy) to "${((summary.averageAccuracy ?: 0.0) * 100).toInt()}%",
                ),
            )
        }
        item {
            SectionTitle(stringResource(R.string.stats_section_level))
            Spacer(Modifier.height(8.dp))
            LevelDistribution(rows = levelStats(state.books, state.stats))
        }
        item {
            SectionTitle(stringResource(R.string.stats_this_month))
            Spacer(Modifier.height(8.dp))
            MonthFootprint(summary.thisMonth, summary.activeDaysThisMonth.toSet())
        }
        item {
            val breakdown = vocabBreakdown(state.vocab)
            SectionTitle(stringResource(R.string.stats_section_vocab))
            Spacer(Modifier.height(8.dp))
            StatGrid(
                items = listOf(
                    "누적" to "${breakdown.total}개",
                    "아직 안 본 단어" to "${breakdown.fresh}개",
                    "모르는 단어" to "${breakdown.unknown}개",
                    "학습 중" to "${breakdown.mastering}개",
                ),
            )
        }
        // 최근 퀴즈 — iOS recentQuizSection 패리티. quizScore 있는 책만 startedAt 내림차순 8개.
        item {
            SectionTitle(stringResource(R.string.stats_section_recent_quiz))
            Spacer(Modifier.height(8.dp))
            RecentQuizSection(books = state.books, stats = state.stats)
        }
        item { Spacer(Modifier.height(12.dp)) }
        }
    }
}

/**
 * 모은 포인트 + 획득 배지 카드 — 웹 `learning-summary/points-card.tsx` 패리티.
 *
 * "압박 없는" 톤: 이미 획득한 것만 보여준다. 다음 배지 조건이나
 * "N점 더 모으면" 같은 결핍 프레이밍은 넣지 않는다(미획득 배지 미표시).
 * 노출 여부(포인트 0 && 배지 0 → 미노출)는 호출부(StatsContent)에서 판정.
 */
@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun PointsCard(points: Int, badges: List<BadgeDef>) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .background(SmapSurface, RoundedCornerShape(16.dp))
            .border(1.dp, SmapBorder, RoundedCornerShape(16.dp))
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            // 메달 아이콘 — 웹 lucide Medal 대응.
            Box(
                modifier = Modifier
                    .size(36.dp)
                    .background(SmapGold.copy(alpha = 0.3f), CircleShape),
                contentAlignment = Alignment.Center,
            ) {
                Icon(
                    imageVector = Icons.Filled.MilitaryTech,
                    contentDescription = null,
                    tint = SmapText,
                    modifier = Modifier.size(18.dp),
                )
            }
            Column(modifier = Modifier.weight(1f)) {
                Text("모은 포인트", style = SmapBodyEmphasisStyle, color = SmapText)
                Text("읽고, 풀고, 외울 때마다 쌓여요", style = SmapCaptionStyle, color = SmapMuted)
            }
            Text(
                text = "%,dP".format(points),
                style = SmapBodyEmphasisStyle,
                color = SmapPrimary,
                modifier = Modifier
                    .background(SmapPrimarySoft, CircleShape)
                    .padding(horizontal = 10.dp, vertical = 4.dp),
            )
        }

        if (badges.isNotEmpty()) {
            FlowRow(
                horizontalArrangement = Arrangement.spacedBy(6.dp),
                verticalArrangement = Arrangement.spacedBy(6.dp),
            ) {
                badges.forEach { badge ->
                    Text(
                        text = "${badge.emoji} ${badge.title}",
                        style = SmapBadgeStyle,
                        color = SmapText,
                        modifier = Modifier
                            .background(SmapBackground, CircleShape)
                            .border(1.dp, SmapBorder, CircleShape)
                            .padding(horizontal = 10.dp, vertical = 5.dp),
                    )
                }
            }
        }
    }
}

/**
 * iOS StatsDashboardView.recentQuizSection 패리티.
 * `quizScore` 있는 책만 골라 `startedAt` 내림차순 상위 8개. 만점(5)은 코랄 강조.
 */
@Composable
private fun RecentQuizSection(
    books: List<site.smap.harubook.core.models.Book>,
    stats: Map<Int, site.smap.harubook.core.models.BookProgressStat>,
) {
    val byId = remember(books) { books.associateBy { it.id } }
    val rows = remember(books, stats) {
        stats.mapNotNull { (id, s) ->
            val book = byId[id] ?: return@mapNotNull null
            val score = s.quizScore ?: return@mapNotNull null
            Triple(book, score, s.startedAtUnix)
        }.sortedByDescending { it.third }.take(8)
    }

    if (rows.isEmpty()) {
        Text(
            text = stringResource(R.string.stats_recent_quiz_empty),
            style = SmapCaptionStyle,
            color = SmapMuted,
            modifier = Modifier.padding(vertical = 12.dp),
        )
        return
    }

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .background(SmapSurface, RoundedCornerShape(16.dp))
            .border(1.dp, SmapBorder, RoundedCornerShape(16.dp)),
    ) {
        rows.forEachIndexed { idx, (book, score, _) ->
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(12.dp),
                modifier = Modifier.fillMaxWidth().padding(12.dp),
            ) {
                Text(
                    text = book.cefr.label,
                    style = SmapBadgeStyle,
                    color = SmapText,
                    modifier = Modifier
                        .background(book.cefr.tint, RoundedCornerShape(6.dp))
                        .padding(horizontal = 8.dp, vertical = 3.dp),
                )
                Text(
                    text = book.title,
                    style = SmapBodyStyle,
                    color = SmapText,
                    maxLines = 1,
                    overflow = androidx.compose.ui.text.style.TextOverflow.Ellipsis,
                    modifier = Modifier.weight(1f),
                )
                Text(
                    text = "$score/5",
                    style = SmapBodyEmphasisStyle,
                    color = if (score == 5) SmapPrimary else SmapText,
                )
            }
            if (idx < rows.size - 1) {
                androidx.compose.material3.HorizontalDivider(
                    color = SmapBorder,
                    modifier = Modifier.padding(start = 12.dp),
                )
            }
        }
    }
}

/**
 * iOS `StatsDashboardView.levelSection` 미러.
 * 각 행: 레벨 배지(파스텔 컬러) + 진행 막대(가장 큰 count 기준 비율) + 상세 텍스트.
 * 전체는 흰 카드 + 1dp 외곽선으로 묶음.
 */
@Composable
private fun LevelDistribution(rows: List<LevelStatRow>) {
    val maxCount = rows.maxOfOrNull { it.count }?.coerceAtLeast(1) ?: 1
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .background(SmapSurface, RoundedCornerShape(16.dp))
            .border(1.dp, SmapBorder, RoundedCornerShape(16.dp))
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        rows.forEach { row ->
            LevelRow(row = row, maxCount = maxCount)
        }
    }
}

@Composable
private fun LevelRow(row: LevelStatRow, maxCount: Int) {
    androidx.compose.foundation.layout.Row(
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(12.dp),
        modifier = Modifier.fillMaxWidth(),
    ) {
        // 레벨 배지 — 파스텔 컬러 배경.
        Text(
            text = row.level.label,
            style = SmapBadgeStyle,
            color = SmapText,
            modifier = Modifier
                .background(row.level.tint, RoundedCornerShape(6.dp))
                .padding(horizontal = 10.dp, vertical = 4.dp),
        )

        // 진행 막대 — 회색 트랙 + 레벨 색 채움.
        Box(
            modifier = Modifier
                .weight(1f)
                .height(18.dp),
        ) {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(18.dp)
                    .background(SmapBorder.copy(alpha = 0.4f), RoundedCornerShape(6.dp)),
            )
            Box(
                modifier = Modifier
                    .fillMaxWidth(row.count.toFloat() / maxCount.toFloat())
                    .height(18.dp)
                    .background(row.level.tint, RoundedCornerShape(6.dp)),
            )
        }

        // 상세 텍스트.
        Text(
            text = buildString {
                append("${row.count}권 · 완독 ${row.finished}")
                row.averageAccuracy?.let { append(" · ${(it * 100).toInt()}%") }
            },
            style = SmapCaptionStyle,
            color = SmapMuted,
            maxLines = 1,
        )
    }
}

@Composable
private fun StatGrid(items: List<Pair<String, String>>) {
    LazyVerticalGrid(
        columns = GridCells.Fixed(2),
        verticalArrangement = Arrangement.spacedBy(10.dp),
        horizontalArrangement = Arrangement.spacedBy(10.dp),
        modifier = Modifier.height(180.dp),
        userScrollEnabled = false,
    ) {
        items(items) { pair ->
            val (label, value) = pair
            Column(
                modifier = Modifier
                    .background(SmapSurface, RoundedCornerShape(14.dp))
                    .border(1.dp, SmapBorder, RoundedCornerShape(14.dp))
                    .padding(14.dp),
            ) {
                Text(label, style = SmapCaptionStyle, color = SmapMuted)
                Text(value, style = SmapTitleStyle, color = SmapText)
            }
        }
    }
}

/**
 * 월간 학습 흔적 — iOS [MonthlyFootprintView.swift] 미러.
 *
 * 헤더(YYYY년 N월 / N일 학습) + 요일 행 + 7열 그리드.
 * 셀 상태: active 는 [SmapPrimary] + 흰 글씨, inactive day 는 옅은 분홍 배경,
 * leading blank(달 시작 이전 빈자리)는 카드 배경이 그대로 드러나도록 흰색 처리.
 * 이전엔 모든 셀을 같은 분홍 배경으로 그려 빈칸·날짜 칸 구분이 안 됐다.
 */
@Composable
private fun MonthFootprint(thisMonth: String, activeDays: Set<String>) {
    val cells = buildMonthGrid(thisMonth, activeDays)
    val (year, month) = parseYearMonth(thisMonth)

    Column(
        verticalArrangement = Arrangement.spacedBy(10.dp),
        modifier = Modifier
            .fillMaxWidth()
            .background(SmapSurface, RoundedCornerShape(16.dp))
            .border(1.dp, SmapBorder, RoundedCornerShape(16.dp))
            .padding(16.dp),
    ) {
        // 헤더: 연/월 + 학습 일수.
        androidx.compose.foundation.layout.Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(
                text = "%04d년 %d월".format(year, month),
                style = SmapBodyEmphasisStyle,
                color = SmapText,
            )
            Spacer(Modifier.weight(1f))
            Text(
                text = "${activeDays.size}일 학습",
                style = SmapCaptionStyle,
                color = SmapMuted,
            )
        }

        // 요일 헤더 — iOS firstWeekday=1(Sunday) 패리티.
        androidx.compose.foundation.layout.Row(modifier = Modifier.fillMaxWidth()) {
            listOf("일", "월", "화", "수", "목", "금", "토").forEach { d ->
                Text(
                    text = d,
                    style = SmapCaptionStyle,
                    color = SmapMuted,
                    textAlign = TextAlign.Center,
                    modifier = Modifier.weight(1f),
                )
            }
        }

        // 7열 그리드 — chunked 로 행 구성. LazyVerticalGrid 의 고정 height 자르기 회피.
        cells.chunked(7).forEach { row ->
            androidx.compose.foundation.layout.Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(6.dp),
            ) {
                row.forEach { cell ->
                    MonthCell(cell, modifier = Modifier.weight(1f))
                }
                // 마지막 행이 7개 미만이면 weight 로 자리 채워 정렬 유지.
                repeat(7 - row.size) {
                    Spacer(modifier = Modifier.weight(1f))
                }
            }
        }
    }
}

@Composable
private fun MonthCell(cell: MonthGridCell, modifier: Modifier = Modifier) {
    if (cell.day == null) {
        // leading blank: 카드 흰 배경 그대로 드러냄 — 분홍 칠 X.
        Spacer(modifier = modifier.height(28.dp))
        return
    }
    Box(
        modifier = modifier
            .height(28.dp)
            .background(
                color = if (cell.active) SmapPrimary else SmapPrimarySoft.copy(alpha = 0.4f),
                shape = RoundedCornerShape(6.dp),
            ),
        contentAlignment = Alignment.Center,
    ) {
        Text(
            text = cell.day.toString(),
            style = SmapCaptionStyle,
            color = if (cell.active) Color.White else SmapMuted,
        )
    }
}

/** "YYYY-MM" 파싱. 실패 시 현재 연/월로 폴백 — iOS parseMonth 패리티. */
private fun parseYearMonth(s: String): Pair<Int, Int> {
    val parts = s.split("-")
    if (parts.size == 2) {
        val y = parts[0].toIntOrNull()
        val m = parts[1].toIntOrNull()
        if (y != null && m != null) return y to m
    }
    val now = java.time.LocalDate.now()
    return now.year to now.monthValue
}

@Composable
private fun SectionTitle(title: String) {
    Text(title, style = SmapBodyEmphasisStyle, color = SmapText)
}

@Composable
private fun CenteredStats(content: @Composable () -> Unit) {
    Box(
        modifier = Modifier.fillMaxSize().background(SmapBackground),
        contentAlignment = Alignment.Center,
    ) { content() }
}

@Composable
private fun StatsError(message: String, onRetry: () -> Unit) {
    Column(
        modifier = Modifier.fillMaxSize().background(SmapBackground).padding(32.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        Text(message, style = SmapBodyStyle, color = SmapDanger, textAlign = TextAlign.Center)
        Spacer(Modifier.height(16.dp))
        PrimaryButton(title = stringResource(R.string.action_retry), variant = PrimaryButtonVariant.Tonal, onClick = onRetry)
    }
}

@Composable
private fun StatsEmpty(message: String) {
    Column(
        modifier = Modifier.fillMaxSize().background(SmapBackground).padding(32.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        Icon(Icons.Filled.BarChart, contentDescription = null, tint = SmapMuted, modifier = Modifier.size(56.dp))
        Spacer(Modifier.height(16.dp))
        Text(message, style = SmapBodyStyle, color = SmapMuted, textAlign = TextAlign.Center)
    }
}
