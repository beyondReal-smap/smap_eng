package site.smap.harubook.features.vocab

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.GpsFixed
import androidx.compose.material.icons.filled.LibraryBooks
import androidx.compose.material.icons.filled.Star
import androidx.compose.material.icons.filled.VerifiedUser
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.derivedStateOf
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewmodel.compose.viewModel
import site.smap.harubook.R
import site.smap.harubook.core.srs.SrsGrade
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
import site.smap.harubook.designsystem.SmapHeadingStyle
import site.smap.harubook.designsystem.SmapMuted
import site.smap.harubook.designsystem.SmapPrimary
import site.smap.harubook.designsystem.SmapPrimaryForeground
import site.smap.harubook.designsystem.SmapPrimarySoft
import site.smap.harubook.designsystem.SmapSurface
import site.smap.harubook.designsystem.SmapText
import site.smap.harubook.designsystem.SmapTitleStyle

@Composable
fun VocabDeckScreen(profileId: Int) {
    val context = LocalContext.current.applicationContext
    val viewModel: VocabViewModel = viewModel(
        key = "vocab-$profileId",
        factory = remember(profileId) {
            object : ViewModelProvider.Factory {
                override fun <T : ViewModel> create(modelClass: Class<T>): T {
                    @Suppress("UNCHECKED_CAST")
                    return VocabViewModel(profileId = profileId, appContext = context) as T
                }
            }
        },
    )
    val state by viewModel.state.collectAsState()
    LaunchedEffect(profileId) { viewModel.load() }

    when {
        state.isLoading && state.entries.isEmpty() ->
            Centered { CircularProgressIndicator(color = SmapPrimary) }
        !state.error.isNullOrBlank() && state.entries.isEmpty() ->
            VocabError(state.error!!, viewModel::load)
        state.entries.isEmpty() -> VocabEmpty()
        else -> VocabContent(viewModel = viewModel)
    }
}

@Composable
private fun VocabContent(viewModel: VocabViewModel) {
    val state by viewModel.state.collectAsState()

    // srsTickKey 가 바뀔 때마다 deck/카운트를 재계산 — derivedStateOf 트리거.
    val deck by remember(viewModel, state.tab, state.entries, state.srsTickKey) {
        derivedStateOf { viewModel.deck() }
    }
    val masteredCount = remember(state.srsTickKey, state.entries) { viewModel.masteredCount() }
    val dueCount = remember(state.srsTickKey, state.entries) { viewModel.dueCount() }
    val unknownCount = remember(state.srsTickKey, state.entries) { viewModel.unknownCount() }
    val remainingCount = remember(state.srsTickKey, state.entries) { viewModel.remainingCount() }
    val gradedToday = remember(state.srsTickKey) { viewModel.gradedTodayCount() }
    val dailyGoalProgress = remember(state.srsTickKey) { viewModel.dailyGoalProgress() }
    val isSessionComplete = remember(state.srsTickKey, state.entries, state.tab) {
        viewModel.isSessionComplete()
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(SmapBackground)
            .padding(horizontal = 20.dp, vertical = 16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        PageHeader(masteredCount = masteredCount)

        if (state.tab == VocabViewModel.Tab.Review) {
            DailyGoalBar(done = gradedToday, progress = dailyGoalProgress)
        }

        TabBar(
            current = state.tab,
            onSelect = viewModel::selectTab,
            dueCount = dueCount,
            unknownCount = unknownCount,
            remainingCount = remainingCount,
        )

        // 학습 컴패니언 — 평가가 일어나는 탭에서만. 훑어보기(전체) 탭에는 미노출.
        // 세션 완료 화면에서는 celebrate 고정(웹 vocab-deck 패리티).
        if (state.tab == VocabViewModel.Tab.Review || state.tab == VocabViewModel.Tab.Unknown) {
            VocabCompanion(
                state = if (isSessionComplete) CompanionState.Celebrate else state.companionState,
                pulse = state.companionPulse,
            )
        }

        if (deck.isEmpty()) {
            Spacer(Modifier.weight(1f))
            if (isSessionComplete) {
                SessionCompleteCard(gradedToday = gradedToday, masteredCount = masteredCount)
            } else {
                EmptyTab(tab = state.tab)
            }
            Spacer(Modifier.weight(1f))
        } else {
            ProgressBar(current = state.index, total = deck.size, onShuffle = viewModel::shuffle)

            val entry = deck.getOrNull(state.index)
            if (entry != null) {
                VocabFlashCard(
                    entry = entry,
                    cardState = viewModel.cardState(entry.word),
                    level = viewModel.srsLevel(entry.word),
                    isFlipped = state.isFlipped,
                    isSpeaking = state.speakingWord == entry.word,
                    onSpeak = { viewModel.speak(entry.word) },
                    onFlip = viewModel::flip,
                )
            }

            val showGrade =
                (state.tab == VocabViewModel.Tab.Review || state.tab == VocabViewModel.Tab.Unknown) &&
                    state.isFlipped
            if (showGrade) {
                GradeButtons(
                    onAgain = { viewModel.grade(SrsGrade.Again) },
                    onGood = { viewModel.grade(SrsGrade.Good) },
                )
            } else {
                NavButtons(
                    onPrev = { viewModel.go(-1) },
                    onNext = { viewModel.go(1) },
                )
            }

            Spacer(Modifier.weight(1f))
        }
    }
}

// MARK: - 헤더 / KPI

@Composable
private fun PageHeader(masteredCount: Int) {
    Column(verticalArrangement = Arrangement.spacedBy(4.dp), modifier = Modifier.fillMaxWidth()) {
        Text(text = stringResource(R.string.vocab_title), style = SmapDisplayStyle, color = SmapText)
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            Text(
                text = "매일 만나는 영어 단어를 차곡차곡",
                style = SmapBodyStyle,
                color = SmapMuted,
            )
            if (masteredCount > 0) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(4.dp),
                    modifier = Modifier
                        .background(SmapPrimarySoft, CircleShape)
                        .padding(horizontal = 8.dp, vertical = 3.dp),
                ) {
                    Icon(
                        imageVector = Icons.Filled.VerifiedUser,
                        contentDescription = null,
                        tint = SmapPrimary,
                        modifier = Modifier.size(12.dp),
                    )
                    Text(
                        text = "마스터 $masteredCount",
                        style = SmapBadgeStyle,
                        color = SmapPrimary,
                    )
                }
            }
        }
    }
}

@Composable
private fun DailyGoalBar(done: Int, progress: Float) {
    Column(
        verticalArrangement = Arrangement.spacedBy(6.dp),
        modifier = Modifier.fillMaxWidth().padding(horizontal = 4.dp),
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(6.dp),
        ) {
            Icon(
                imageVector = Icons.Filled.GpsFixed,
                contentDescription = null,
                tint = SmapPrimary,
                modifier = Modifier.size(13.dp),
            )
            Text(
                text = "오늘 $done / ${VocabViewModel.DAILY_GOAL} 단어",
                style = SmapBadgeStyle.copy(fontSize = 13.sp),
                color = SmapPrimary,
            )
        }
        LinearProgressIndicator(
            progress = { progress },
            color = SmapPrimary,
            trackColor = SmapPrimarySoft,
            modifier = Modifier
                .fillMaxWidth()
                .height(6.dp)
                .clip(RoundedCornerShape(3.dp)),
        )
    }
}

// MARK: - 탭 바

@Composable
private fun TabBar(
    current: VocabViewModel.Tab,
    onSelect: (VocabViewModel.Tab) -> Unit,
    dueCount: Int,
    unknownCount: Int,
    remainingCount: Int,
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .horizontalScroll(rememberScrollState()),
        horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        VocabViewModel.Tab.values().forEach { t ->
            val badge = when (t) {
                VocabViewModel.Tab.Review -> dueCount
                VocabViewModel.Tab.Unknown -> unknownCount
                VocabViewModel.Tab.All -> remainingCount
            }
            TabButton(
                label = t.label,
                badge = if (badge > 0) badge else null,
                selected = current == t,
                onClick = { onSelect(t) },
            )
        }
    }
}

@Composable
private fun TabButton(
    label: String,
    badge: Int?,
    selected: Boolean,
    onClick: () -> Unit,
) {
    val bg = if (selected) SmapPrimary else SmapSurface
    val fg = if (selected) SmapPrimaryForeground else SmapText
    Row(
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(6.dp),
        modifier = Modifier
            .height(44.dp)
            .clip(RoundedCornerShape(12.dp))
            .background(bg)
            .border(
                width = if (selected) 0.dp else 1.dp,
                color = if (selected) Color.Transparent else SmapBorder,
                shape = RoundedCornerShape(12.dp),
            )
            .clickable(onClick = onClick)
            .padding(horizontal = 14.dp),
    ) {
        Text(text = label, style = SmapBodyEmphasisStyle.copy(fontSize = 14.sp), color = fg)
        if (badge != null) {
            Text(
                text = badge.toString(),
                style = SmapBadgeStyle.copy(fontSize = 11.sp),
                color = if (selected) Color.White else SmapPrimaryForeground,
                textAlign = TextAlign.Center,
                modifier = Modifier
                    .background(
                        color = if (selected) Color.White.copy(alpha = 0.25f) else SmapPrimarySoft,
                        shape = CircleShape,
                    )
                    .padding(horizontal = 7.dp, vertical = 2.dp),
            )
        }
    }
}

// MARK: - Progress bar

@Composable
private fun ProgressBar(current: Int, total: Int, onShuffle: () -> Unit) {
    Column(
        verticalArrangement = Arrangement.spacedBy(6.dp),
        modifier = Modifier.fillMaxWidth().padding(horizontal = 4.dp),
    ) {
        Row(modifier = Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
            Text(
                text = "${current + 1} / $total",
                style = SmapCaptionStyle,
                color = SmapMuted,
            )
            Spacer(Modifier.weight(1f))
            Text(
                text = "섞기",
                style = SmapCaptionStyle,
                color = SmapPrimary,
                modifier = Modifier
                    .clip(RoundedCornerShape(6.dp))
                    .clickable(onClick = onShuffle)
                    .padding(4.dp),
            )
        }
        LinearProgressIndicator(
            progress = { (current + 1).toFloat() / kotlin.math.max(1, total) },
            color = SmapPrimary,
            trackColor = SmapBorder.copy(alpha = 0.4f),
            modifier = Modifier
                .fillMaxWidth()
                .height(6.dp)
                .clip(RoundedCornerShape(3.dp)),
        )
    }
}

// MARK: - 평가/내비 버튼

@Composable
private fun GradeButtons(onAgain: () -> Unit, onGood: () -> Unit) {
    Row(
        horizontalArrangement = Arrangement.spacedBy(12.dp),
        modifier = Modifier.fillMaxWidth(),
    ) {
        PrimaryButton(
            title = "몰라요",
            variant = PrimaryButtonVariant.Outline,
            onClick = onAgain,
            modifier = Modifier.weight(1f),
        )
        PrimaryButton(
            title = "알아요",
            variant = PrimaryButtonVariant.Filled,
            onClick = onGood,
            modifier = Modifier.weight(1f),
        )
    }
}

@Composable
private fun NavButtons(onPrev: () -> Unit, onNext: () -> Unit) {
    Row(
        horizontalArrangement = Arrangement.spacedBy(12.dp),
        modifier = Modifier.fillMaxWidth(),
    ) {
        PrimaryButton(
            title = "이전",
            variant = PrimaryButtonVariant.Outline,
            onClick = onPrev,
            modifier = Modifier.weight(1f),
        )
        PrimaryButton(
            title = "다음",
            variant = PrimaryButtonVariant.Filled,
            onClick = onNext,
            modifier = Modifier.weight(1f),
        )
    }
}

// MARK: - Empty / completion

@Composable
private fun SessionCompleteCard(gradedToday: Int, masteredCount: Int) {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(16.dp),
        modifier = Modifier.fillMaxWidth().padding(horizontal = 32.dp),
    ) {
        Box(
            modifier = Modifier
                .size(96.dp)
                .background(SmapPrimarySoft, CircleShape),
            contentAlignment = Alignment.Center,
        ) {
            Icon(
                imageVector = Icons.Filled.VerifiedUser,
                contentDescription = null,
                tint = SmapPrimary,
                modifier = Modifier.size(48.dp),
            )
        }
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(6.dp),
        ) {
            Text(text = "오늘 학습 완료!", style = SmapTitleStyle, color = SmapText)
            Text(
                text = "오늘 ${gradedToday}개 단어를 학습했어요",
                style = SmapBodyStyle,
                color = SmapMuted,
            )
        }
        if (masteredCount > 0) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(6.dp),
                modifier = Modifier
                    .background(SmapPrimarySoft, CircleShape)
                    .padding(horizontal = 12.dp, vertical = 6.dp),
            ) {
                Icon(
                    imageVector = Icons.Filled.Star,
                    contentDescription = null,
                    tint = SmapPrimary,
                    modifier = Modifier.size(13.dp),
                )
                Text(
                    text = "누적 마스터 ${masteredCount}개",
                    style = SmapBadgeStyle.copy(fontSize = 13.sp),
                    color = SmapPrimary,
                )
            }
        }
        Text(
            text = "다음 복습은 단어마다 정해진 시간에 다시 알려드릴게요.",
            style = SmapCaptionStyle,
            color = SmapMuted,
            textAlign = TextAlign.Center,
            modifier = Modifier.padding(horizontal = 24.dp, vertical = 4.dp),
        )
    }
}

@Composable
private fun EmptyTab(tab: VocabViewModel.Tab) {
    val (headline, subline) = when (tab) {
        VocabViewModel.Tab.Review -> "오늘 학습할 단어가 없어요" to "잠시 쉬거나 '전체' 탭에서 다시 훑어 보세요."
        VocabViewModel.Tab.Unknown -> "다시 볼 단어가 없어요" to "'모르겠다'고 표시한 단어가 모이면 여기에 나타나요."
        VocabViewModel.Tab.All -> "단어가 없어요" to "책을 더 읽으면 단어가 쌓여요."
    }
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(8.dp),
        modifier = Modifier.fillMaxWidth().padding(horizontal = 32.dp),
    ) {
        Icon(
            imageVector = Icons.Filled.CheckCircle,
            contentDescription = null,
            tint = SmapPrimary,
            modifier = Modifier.size(40.dp),
        )
        Text(text = headline, style = SmapBodyEmphasisStyle, color = SmapText)
        Text(text = subline, style = SmapCaptionStyle, color = SmapMuted, textAlign = TextAlign.Center)
    }
}

// MARK: - Loading / error / empty (entries 자체가 비어있을 때)

@Composable
private fun Centered(content: @Composable () -> Unit) {
    Column(
        modifier = Modifier.fillMaxSize().background(SmapBackground),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) { content() }
}

@Composable
private fun VocabError(message: String, onRetry: () -> Unit) {
    Column(
        modifier = Modifier.fillMaxSize().background(SmapBackground).padding(32.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        Text(message, style = SmapBodyStyle, color = SmapDanger, textAlign = TextAlign.Center)
        Spacer(Modifier.height(16.dp))
        PrimaryButton(title = "다시 시도", variant = PrimaryButtonVariant.Tonal, onClick = onRetry)
    }
}

@Composable
private fun VocabEmpty() {
    Column(
        modifier = Modifier.fillMaxSize().background(SmapBackground).padding(32.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        Icon(
            imageVector = Icons.Filled.LibraryBooks,
            contentDescription = null,
            tint = SmapMuted,
            modifier = Modifier.size(56.dp),
        )
        Spacer(Modifier.height(16.dp))
        Text(
            text = "아직 모은 단어가 없어요",
            style = SmapHeadingStyle,
            color = SmapText,
        )
        Spacer(Modifier.height(6.dp))
        Text(
            text = "책을 만들고 읽어 보면 단어가 여기에 쌓여요.",
            style = SmapBodyStyle,
            color = SmapMuted,
            textAlign = TextAlign.Center,
        )
    }
}
