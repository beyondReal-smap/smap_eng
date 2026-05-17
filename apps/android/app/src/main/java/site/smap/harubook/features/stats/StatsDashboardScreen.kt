package site.smap.harubook.features.stats

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
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
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.BarChart
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
    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .background(SmapBackground)
            .padding(horizontal = 20.dp),
        verticalArrangement = Arrangement.spacedBy(20.dp),
    ) {
        item {
            Text(
                stringResource(R.string.stats_title),
                style = SmapDisplayStyle,
                color = SmapText,
                modifier = Modifier.padding(top = 20.dp),
            )
        }
        item {
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
            SectionTitle("레벨별 독서량")
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
            SectionTitle("단어장")
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
        item { Spacer(Modifier.height(12.dp)) }
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

@Composable
private fun MonthFootprint(thisMonth: String, activeDays: Set<String>) {
    val cells = buildMonthGrid(thisMonth, activeDays)
    LazyVerticalGrid(
        columns = GridCells.Fixed(7),
        verticalArrangement = Arrangement.spacedBy(6.dp),
        horizontalArrangement = Arrangement.spacedBy(6.dp),
        modifier = Modifier
            .fillMaxWidth()
            .height(260.dp)
            .background(SmapSurface, RoundedCornerShape(16.dp))
            .border(1.dp, SmapBorder, RoundedCornerShape(16.dp))
            .padding(14.dp),
        userScrollEnabled = false,
    ) {
        items(cells) { cell ->
            Box(
                modifier = Modifier
                    .background(
                        if (cell.active) SmapPrimary else SmapPrimarySoft.copy(alpha = 0.45f),
                        RoundedCornerShape(6.dp),
                    )
                    .size(28.dp),
                contentAlignment = Alignment.Center,
            ) {
                Text(
                    text = cell.day?.toString().orEmpty(),
                    style = SmapCaptionStyle,
                    color = if (cell.active) Color.White else SmapMuted,
                )
            }
        }
    }
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
