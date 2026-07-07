package site.smap.harubook.features.reader

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.ChevronLeft
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material.icons.filled.FormatSize
import androidx.compose.material.icons.filled.HelpOutline
import androidx.compose.material.icons.filled.MenuBook
import androidx.compose.material.icons.filled.Pause
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Text
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.snapshotFlow
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewmodel.compose.viewModel
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.launch
import site.smap.harubook.core.audio.AudioPlayer
import site.smap.harubook.core.models.CefrLevel
import site.smap.harubook.core.models.VocabularyEntry
import site.smap.harubook.core.srs.SrsGrade
import site.smap.harubook.designsystem.A2zFontFamily
import site.smap.harubook.designsystem.PrimaryButton
import site.smap.harubook.designsystem.PrimaryButtonVariant
import site.smap.harubook.designsystem.SmapBackground
import site.smap.harubook.designsystem.SmapBadgeStyle
import site.smap.harubook.designsystem.SmapBodyEmphasisStyle
import site.smap.harubook.designsystem.SmapBodyStyle
import site.smap.harubook.designsystem.SmapBorder
import site.smap.harubook.designsystem.SmapCaptionStyle
import site.smap.harubook.designsystem.SmapDanger
import site.smap.harubook.designsystem.SmapMuted
import site.smap.harubook.designsystem.SmapMutedBg
import site.smap.harubook.designsystem.SmapPrimary
import site.smap.harubook.designsystem.SmapPrimaryForeground
import site.smap.harubook.designsystem.SmapPrimarySoft
import site.smap.harubook.designsystem.SmapSurface
import site.smap.harubook.designsystem.SmapText
import site.smap.harubook.designsystem.tint

/**
 * iOS `ReaderView.swift` 패리티 — 상단 toolbar(책 제목) + 헤더(나이/CEFR 배지 + N/M + 진행률 바)
 * + HorizontalPager + 하단 컨트롤바(텍스트 크기 4단계 + 이전/듣기/한글/다음·퀴즈 4 캡슐).
 *
 * iOS 와 다른 점:
 *  - 페이지 전환: TabView → HorizontalPager (시각적으로 동일한 가로 스와이프)
 *  - "삽화" 기능은 iOS 에 없으므로 패리티 위해 제거 — 백엔드 API 는 유지(다시 도입 가능)
 */
@Composable
fun ReaderScreen(
    bookId: Int,
    profileId: Int,
    onBack: () -> Unit,
    onOpenQuiz: (bookId: Int, logId: Int?) -> Unit,
) {
    val context = LocalContext.current
    val viewModel: ReaderViewModel = viewModel(
        key = "reader-$bookId",
        factory = remember(bookId, profileId) {
            object : ViewModelProvider.Factory {
                override fun <T : ViewModel> create(modelClass: Class<T>): T {
                    @Suppress("UNCHECKED_CAST")
                    return ReaderViewModel(bookId, profileId, context.applicationContext) as T
                }
            }
        },
    )
    val state by viewModel.state.collectAsState()
    val audio by AudioPlayer.state.collectAsState()
    val scope = rememberCoroutineScope()

    LaunchedEffect(bookId) { viewModel.bootstrap() }

    val pagerState = rememberPagerState(pageCount = { state.passages.size })

    // 페이지 스와이프 시 ViewModel 동기화.
    LaunchedEffect(state.passages.size) {
        snapshotFlow { pagerState.currentPage }.distinctUntilChanged().collect { page ->
            viewModel.reportPageChanged(page)
        }
    }

    androidx.compose.runtime.DisposableEffect(Unit) {
        onDispose { viewModel.leave() }
    }

    Column(modifier = Modifier.fillMaxSize().background(SmapBackground)) {
        ReaderTopBar(title = state.book?.title.orEmpty(), onBack = onBack)
        ReaderHeader(
            age = state.book?.age,
            cefr = state.book?.cefr,
            currentIndex = state.currentIndex,
            total = state.passages.size,
        )

        when {
            state.isLoadingDetail && state.passages.isEmpty() -> Loading()
            !state.error.isNullOrBlank() && state.passages.isEmpty() -> ErrorBlock(
                message = state.error.orEmpty(),
                onRetry = viewModel::bootstrap,
            )
            else -> {
                HorizontalPager(
                    state = pagerState,
                    modifier = Modifier.weight(1f),
                ) { index ->
                    val passage = state.passages.getOrNull(index) ?: return@HorizontalPager
                    PassageView(
                        passage = passage,
                        vocabulary = state.vocabulary,
                        showsKorean = state.showsKorean,
                        // pause 상태에서도 nowPlayingPassageId는 유지되므로 isActivelyPlaying으로
                        // 판정해야 하이라이트/라벨이 정지에 반응한다.
                        isPlaying = audio.isActivelyPlaying(passage.id),
                        textScale = state.textScale,
                        generatingScene = state.generatingScenePassageId == passage.id,
                        // 인라인 Popup 으로 단어 옆에 즉시 평가 가능 — 전역 ModalBottomSheet 제거.
                        onGradeVocab = viewModel::gradeVocab,
                        // 책 속 미션 — 웹 reader.tsx 패리티. 레거시 책(missions 없음)은 null.
                        mission = state.missionByIndex[index],
                        missionDone = state.completedMissions.contains(index),
                        onMissionComplete = { viewModel.completeMission(index) },
                        // pager 사전 구성(pre-composition) 페이지도 있어 index 를 명시적으로 전달.
                        onWordTap = { word -> viewModel.reportWordTapped(index, word) },
                    )
                }

                val current = state.passages.getOrNull(state.currentIndex)
                val isLast = state.passages.isNotEmpty() && state.currentIndex == state.passages.lastIndex
                BottomBar(
                    currentIndex = state.currentIndex,
                    total = state.passages.size,
                    isPlaying = audio.isActivelyPlaying(current?.id),
                    isPreparing = audio.preparingPassageId == current?.id ||
                        state.synthesizingPassageId == current?.id,
                    showsKorean = state.showsKorean,
                    isLastPage = isLast,
                    textScale = state.textScale,
                    onPrev = {
                        if (state.currentIndex > 0) {
                            scope.launch { pagerState.animateScrollToPage(state.currentIndex - 1) }
                        }
                    },
                    onNext = {
                        if (state.currentIndex + 1 < state.passages.size) {
                            scope.launch { pagerState.animateScrollToPage(state.currentIndex + 1) }
                        }
                    },
                    onPlay = { viewModel.togglePlayback(state.currentIndex) },
                    onToggleKorean = viewModel::toggleKorean,
                    onOpenQuiz = { onOpenQuiz(bookId, state.readingLogId) },
                    onSelectTextScale = viewModel::setTextScale,
                )
            }
        }
    }

}

// MARK: - Top bar / Header

@Composable
private fun ReaderTopBar(title: String, onBack: () -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Icon(
            imageVector = Icons.AutoMirrored.Filled.ArrowBack,
            contentDescription = "뒤로",
            tint = SmapText,
            modifier = Modifier.size(28.dp).clickable(onClick = onBack),
        )
        Text(
            text = title,
            style = SmapBodyEmphasisStyle,
            color = SmapText,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
            modifier = Modifier.weight(1f),
        )
        // 우측 균형 — 좌측 ArrowBack 과 시각적 대칭을 맞춰 제목이 정중앙에 보이도록.
        Box(modifier = Modifier.size(28.dp))
    }
}

/**
 * iOS ReaderView.header 패리티 — 나이 배지 + CEFR 배지(레벨 색) + N/M + 진행률 바.
 * CEFR 배지는 책장/통계와 동일한 레벨별 파스텔 — 앱 전반 일관성.
 */
@Composable
private fun ReaderHeader(age: Int?, cefr: CefrLevel?, currentIndex: Int, total: Int) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 24.dp)
            .padding(top = 4.dp, bottom = 8.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            if (age != null) {
                Badge(text = "${age}세", background = SmapMutedBg, foreground = SmapText)
                androidx.compose.foundation.layout.Spacer(Modifier.size(10.dp))
            }
            if (cefr != null) {
                Badge(text = cefr.label, background = cefr.tint, foreground = SmapText)
            }
            Box(modifier = Modifier.weight(1f))
            if (total > 0) {
                Text(
                    text = "${currentIndex + 1} / $total",
                    style = SmapCaptionStyle,
                    color = SmapMuted,
                )
            }
        }
        if (total > 0) {
            LinearProgressIndicator(
                progress = { (currentIndex + 1).toFloat() / total.toFloat() },
                color = SmapPrimary,
                trackColor = SmapBorder.copy(alpha = 0.4f),
                modifier = Modifier
                    .fillMaxWidth()
                    .height(4.dp)
                    .clip(CircleShape),
            )
        }
    }
}

@Composable
private fun Badge(text: String, background: Color, foreground: Color) {
    Text(
        text = text,
        style = SmapBadgeStyle,
        color = foreground,
        modifier = Modifier
            .background(background, CircleShape)
            .padding(horizontal = 10.dp, vertical = 5.dp),
    )
}

// MARK: - Bottom bar

@Composable
private fun BottomBar(
    currentIndex: Int,
    total: Int,
    isPlaying: Boolean,
    isPreparing: Boolean,
    showsKorean: Boolean,
    isLastPage: Boolean,
    textScale: ReaderTextScale,
    onPrev: () -> Unit,
    onNext: () -> Unit,
    onPlay: () -> Unit,
    onToggleKorean: () -> Unit,
    onOpenQuiz: () -> Unit,
    onSelectTextScale: (ReaderTextScale) -> Unit,
) {
    Column(modifier = Modifier.fillMaxWidth().background(SmapBackground)) {
        HorizontalDivider(color = SmapBorder)

        // 텍스트 크기 4단계 — iOS textScaleControl 패리티. 본문 작성 중에도 즉시 닿을 보조 컨트롤.
        TextScaleControl(
            current = textScale,
            onSelect = onSelectTextScale,
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 14.dp, vertical = 10.dp),
        )

        // 컨트롤 4개 캡슐 — iOS HStack 패리티. 마지막 페이지면 next 자리에 퀴즈 버튼.
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 14.dp, vertical = 8.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            PreviousButton(
                enabled = currentIndex > 0,
                onClick = onPrev,
                modifier = Modifier.weight(1f),
            )
            ListenButton(
                isPlaying = isPlaying,
                isPreparing = isPreparing,
                onClick = onPlay,
                modifier = Modifier.weight(1f),
            )
            KoreanToggle(
                active = showsKorean,
                onClick = onToggleKorean,
                modifier = Modifier.weight(1f),
            )
            if (isLastPage) {
                QuizButton(onClick = onOpenQuiz, modifier = Modifier.weight(1f))
            } else {
                NextButton(
                    enabled = currentIndex + 1 < total,
                    onClick = onNext,
                    modifier = Modifier.weight(1f),
                )
            }
        }
    }
}

private val CONTROL_HEIGHT = 48.dp

@Composable
private fun PreviousButton(enabled: Boolean, onClick: () -> Unit, modifier: Modifier = Modifier) {
    ControlCapsule(
        background = if (enabled) SmapSurface else SmapSurface.copy(alpha = 0.5f),
        foreground = if (enabled) SmapText else SmapMuted,
        border = SmapBorder,
        enabled = enabled,
        onClick = onClick,
        modifier = modifier,
    ) {
        Icon(
            imageVector = Icons.Filled.ChevronLeft,
            contentDescription = null,
            tint = if (enabled) SmapText else SmapMuted,
            modifier = Modifier.size(18.dp),
        )
        Text(
            text = "이전",
            style = SmapBodyEmphasisStyle.copy(fontSize = 14.sp),
            color = if (enabled) SmapText else SmapMuted,
        )
    }
}

@Composable
private fun NextButton(enabled: Boolean, onClick: () -> Unit, modifier: Modifier = Modifier) {
    // iOS 와 동일하게 tonal(SmapPrimarySoft + 코랄 잉크) — 듣기/퀴즈와 같은 fill 을 쓰면 코랄 톤이 과해진다.
    ControlCapsule(
        background = SmapPrimarySoft,
        foreground = SmapPrimaryForeground,
        border = SmapPrimary.copy(alpha = 0.25f),
        enabled = enabled,
        onClick = onClick,
        modifier = modifier,
    ) {
        Text(
            text = "다음",
            style = SmapBodyEmphasisStyle.copy(fontSize = 14.sp),
            color = SmapPrimaryForeground,
        )
        Icon(
            imageVector = Icons.Filled.ChevronRight,
            contentDescription = null,
            tint = SmapPrimaryForeground,
            modifier = Modifier.size(18.dp),
        )
    }
}

@Composable
private fun ListenButton(
    isPlaying: Boolean,
    isPreparing: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    ControlCapsule(
        background = SmapPrimary,
        foreground = SmapPrimaryForeground,
        border = Color.Transparent,
        enabled = true,
        onClick = onClick,
        modifier = modifier,
    ) {
        if (isPreparing) {
            CircularProgressIndicator(
                color = SmapPrimaryForeground,
                strokeWidth = 2.dp,
                modifier = Modifier.size(16.dp),
            )
        } else {
            Icon(
                imageVector = if (isPlaying) Icons.Filled.Pause else Icons.Filled.PlayArrow,
                contentDescription = null,
                tint = SmapPrimaryForeground,
                modifier = Modifier.size(18.dp),
            )
        }
        Text(
            text = if (isPlaying) "정지" else if (isPreparing) "준비" else "듣기",
            style = SmapBodyEmphasisStyle.copy(fontSize = 14.sp),
            color = SmapPrimaryForeground,
        )
    }
}

@Composable
private fun KoreanToggle(active: Boolean, onClick: () -> Unit, modifier: Modifier = Modifier) {
    ControlCapsule(
        background = if (active) SmapPrimarySoft else SmapSurface,
        foreground = if (active) SmapPrimary else SmapText,
        border = if (active) SmapPrimary.copy(alpha = 0.4f) else SmapBorder,
        enabled = true,
        onClick = onClick,
        modifier = modifier,
    ) {
        Icon(
            imageVector = Icons.Filled.MenuBook,
            contentDescription = null,
            tint = if (active) SmapPrimary else SmapText,
            modifier = Modifier.size(18.dp),
        )
        Text(
            text = "한글",
            style = SmapBodyEmphasisStyle.copy(fontSize = 14.sp),
            color = if (active) SmapPrimary else SmapText,
        )
    }
}

@Composable
private fun QuizButton(onClick: () -> Unit, modifier: Modifier = Modifier) {
    ControlCapsule(
        background = SmapPrimary,
        foreground = SmapPrimaryForeground,
        border = Color.Transparent,
        enabled = true,
        onClick = onClick,
        modifier = modifier,
    ) {
        Icon(
            imageVector = Icons.Filled.HelpOutline,
            contentDescription = null,
            tint = SmapPrimaryForeground,
            modifier = Modifier.size(18.dp),
        )
        Text(
            text = "퀴즈",
            style = SmapBodyEmphasisStyle.copy(fontSize = 14.sp),
            color = SmapPrimaryForeground,
        )
    }
}

@Composable
private fun ControlCapsule(
    background: Color,
    foreground: Color,
    border: Color,
    enabled: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    content: @Composable () -> Unit,
) {
    Row(
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(4.dp, Alignment.CenterHorizontally),
        modifier = modifier
            .height(CONTROL_HEIGHT)
            .clip(CircleShape)
            .background(background)
            .border(width = 1.dp, color = border, shape = CircleShape)
            .alpha(if (enabled) 1f else 0.6f)
            .clickable(enabled = enabled, onClick = onClick)
            .padding(horizontal = 12.dp),
    ) {
        content()
    }
}

@Composable
private fun TextScaleControl(
    current: ReaderTextScale,
    onSelect: (ReaderTextScale) -> Unit,
    modifier: Modifier = Modifier,
) {
    Row(
        modifier = modifier,
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(6.dp),
    ) {
        Icon(
            imageVector = Icons.Filled.FormatSize,
            contentDescription = null,
            tint = SmapMuted,
            modifier = Modifier.size(16.dp),
        )
        ReaderTextScale.entries.forEach { scale ->
            val selected = current == scale
            Box(
                modifier = Modifier
                    .weight(1f)
                    .height(34.dp)
                    .clip(CircleShape)
                    .background(if (selected) SmapPrimary else SmapSurface)
                    .border(
                        width = 1.dp,
                        color = if (selected) Color.Transparent else SmapBorder,
                        shape = CircleShape,
                    )
                    .clickable { onSelect(scale) },
                contentAlignment = Alignment.Center,
            ) {
                Text(
                    text = "A",
                    fontSize = scale.previewSp.sp,
                    fontWeight = FontWeight.Bold,
                    fontFamily = A2zFontFamily,
                    color = if (selected) SmapPrimaryForeground else SmapText,
                )
            }
        }
    }
}

// MARK: - Loading / error

@Composable
private fun Loading() {
    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        CircularProgressIndicator(color = SmapPrimary)
    }
}

@Composable
private fun ErrorBlock(message: String, onRetry: () -> Unit) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(horizontal = 24.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp, Alignment.CenterVertically),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Text(message, style = SmapBodyStyle, color = SmapDanger, textAlign = TextAlign.Center)
        PrimaryButton(
            title = "다시 시도",
            variant = PrimaryButtonVariant.Tonal,
            onClick = onRetry,
        )
    }
}
