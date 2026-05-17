package site.smap.harubook.features.reader

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
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
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.GraphicEq
import androidx.compose.material.icons.filled.Pause
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.Translate
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.runtime.snapshotFlow
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewmodel.compose.viewModel
import kotlinx.coroutines.flow.distinctUntilChanged
import site.smap.harubook.core.audio.AudioPlayer
import site.smap.harubook.designsystem.PrimaryButton
import site.smap.harubook.designsystem.PrimaryButtonVariant
import site.smap.harubook.designsystem.SmapBackground
import site.smap.harubook.designsystem.SmapBodyEmphasisStyle
import site.smap.harubook.designsystem.SmapBodyStyle
import site.smap.harubook.designsystem.SmapBorder
import site.smap.harubook.designsystem.SmapCaptionStyle
import site.smap.harubook.designsystem.SmapDanger
import site.smap.harubook.designsystem.SmapMuted
import site.smap.harubook.designsystem.SmapPrimary
import site.smap.harubook.designsystem.SmapPrimaryForeground
import site.smap.harubook.designsystem.SmapPrimarySoft
import site.smap.harubook.designsystem.SmapSurface
import site.smap.harubook.designsystem.SmapText

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
        TopBar(onBack = onBack, total = state.passages.size, currentIndex = state.currentIndex)

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
                        showsKorean = state.showsKorean,
                        isPlaying = audio.nowPlayingPassageId == passage.id,
                        textScale = state.textScale,
                        generatingScene = state.generatingScenePassageId == passage.id,
                    )
                }

                BottomBar(
                    isPreparing = audio.preparingPassageId != null ||
                        state.synthesizingPassageId == state.passages.getOrNull(state.currentIndex)?.id,
                    isPlaying = audio.nowPlayingPassageId == state.passages.getOrNull(state.currentIndex)?.id,
                    showsKorean = state.showsKorean,
                    isLastPage = state.passages.isNotEmpty() && state.currentIndex == state.passages.lastIndex,
                    onPlay = { viewModel.togglePlayback(state.currentIndex) },
                    onToggleKorean = viewModel::toggleKorean,
                    onRequestScene = { viewModel.requestSceneImage(state.currentIndex) },
                    onOpenQuiz = { onOpenQuiz(bookId, state.readingLogId) },
                )
            }
        }
    }
}

@Composable
private fun TopBar(onBack: () -> Unit, total: Int, currentIndex: Int) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Icon(
            Icons.AutoMirrored.Filled.ArrowBack,
            contentDescription = "뒤로",
            tint = SmapText,
            modifier = Modifier
                .size(28.dp)
                .clickable(onClick = onBack),
        )
        Box(modifier = Modifier.weight(1f))
        if (total > 0) {
            Text("${currentIndex + 1} / $total", style = SmapCaptionStyle, color = SmapMuted)
        }
    }
}

@Composable
private fun BottomBar(
    isPreparing: Boolean,
    isPlaying: Boolean,
    showsKorean: Boolean,
    isLastPage: Boolean,
    onPlay: () -> Unit,
    onToggleKorean: () -> Unit,
    onRequestScene: () -> Unit,
    onOpenQuiz: () -> Unit,
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .background(SmapBackground)
            .padding(horizontal = 16.dp, vertical = 12.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(10.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            ControlPill(
                icon = if (isPlaying) Icons.Filled.Pause else Icons.Filled.PlayArrow,
                label = if (isPreparing) "준비 중" else (if (isPlaying) "일시정지" else "듣기"),
                isLoading = isPreparing,
                onClick = onPlay,
                modifier = Modifier.weight(1f),
            )
            ControlPill(
                icon = Icons.Filled.Translate,
                label = if (showsKorean) "한글 끄기" else "한글",
                selected = showsKorean,
                onClick = onToggleKorean,
                modifier = Modifier.weight(1f),
            )
            ControlPill(
                icon = Icons.Filled.GraphicEq,
                label = "삽화",
                onClick = onRequestScene,
                modifier = Modifier.weight(1f),
            )
        }

        if (isLastPage) {
            PrimaryButton(title = "퀴즈 시작하기", onClick = onOpenQuiz)
        }
    }
}

@Composable
private fun ControlPill(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    label: String,
    isLoading: Boolean = false,
    selected: Boolean = false,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val background = if (selected) SmapPrimary else SmapSurface
    val foreground = if (selected) SmapPrimaryForeground else SmapText
    Row(
        modifier = modifier
            .height(48.dp)
            .clickable(onClick = onClick)
            .background(background, RoundedCornerShape(percent = 50))
            .border(
                width = if (selected) 0.dp else 1.dp,
                color = if (selected) SmapPrimarySoft else SmapBorder,
                shape = RoundedCornerShape(percent = 50),
            )
            .padding(horizontal = 12.dp),
        horizontalArrangement = Arrangement.spacedBy(6.dp, Alignment.CenterHorizontally),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        if (isLoading) {
            CircularProgressIndicator(color = foreground, strokeWidth = 2.dp, modifier = Modifier.size(16.dp))
        } else {
            Icon(icon, contentDescription = null, tint = foreground, modifier = Modifier.size(18.dp))
        }
        Text(label, style = SmapBodyEmphasisStyle, color = foreground)
    }
}

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
