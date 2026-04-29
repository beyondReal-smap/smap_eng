package site.smap.harubook.features.reader

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ChevronLeft
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material.icons.filled.MenuBook
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Divider
import androidx.compose.material3.Icon
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.runtime.snapshotFlow
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewmodel.compose.viewModel
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.flow.drop
import site.smap.harubook.R
import site.smap.harubook.core.models.Passage
import site.smap.harubook.designsystem.AuthenticatedAsyncImage
import site.smap.harubook.designsystem.BadgeChip
import site.smap.harubook.designsystem.BadgeTone
import site.smap.harubook.designsystem.SmapBackground
import site.smap.harubook.designsystem.SmapBodyEmphasisStyle
import site.smap.harubook.designsystem.SmapBodyStyle
import site.smap.harubook.designsystem.SmapBorder
import site.smap.harubook.designsystem.SmapCaptionStyle
import site.smap.harubook.designsystem.SmapDanger
import site.smap.harubook.designsystem.SmapHeadingStyle
import site.smap.harubook.designsystem.SmapMuted
import site.smap.harubook.designsystem.SmapPrimary
import site.smap.harubook.designsystem.SmapPrimarySoft
import site.smap.harubook.designsystem.SmapReaderStyle
import site.smap.harubook.designsystem.SmapSurface
import site.smap.harubook.designsystem.SmapText

@Composable
fun ReaderScreen(
    bookId: Int,
    profileId: Int,
    onBack: () -> Unit,
) {
    val viewModel: ReaderViewModel = viewModel(
        key = "reader-$bookId",
        factory = remember(bookId, profileId) {
            object : ViewModelProvider.Factory {
                override fun <T : ViewModel> create(modelClass: Class<T>): T {
                    @Suppress("UNCHECKED_CAST")
                    return ReaderViewModel(bookId = bookId, profileId = profileId) as T
                }
            }
        },
    )
    val state by viewModel.state.collectAsState()

    LaunchedEffect(bookId) { viewModel.bootstrap() }

    DisposableEffect(Unit) {
        onDispose { viewModel.leave() }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(SmapBackground),
    ) {
        Header(
            title = state.title,
            age = state.age,
            cefr = state.cefrLabel,
            currentIndex = state.currentIndex,
            total = state.passages.size,
            onBack = onBack,
        )

        when {
            state.isLoading -> Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = SmapPrimary)
            }
            state.error != null -> Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                Text(state.error!!, style = SmapBodyStyle, color = SmapDanger, textAlign = TextAlign.Center)
            }
            state.passages.isEmpty() -> Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                Text("아직 문장이 준비되지 않았습니다.", style = SmapBodyStyle, color = SmapMuted)
            }
            else -> {
                val pagerState = rememberPagerState(pageCount = { state.passages.size })

                LaunchedEffect(pagerState) {
                    snapshotFlow { pagerState.currentPage }
                        .drop(1)
                        .distinctUntilChanged()
                        .collect { page -> viewModel.reportPageChanged(page) }
                }

                HorizontalPager(
                    state = pagerState,
                    modifier = Modifier
                        .fillMaxWidth()
                        .weight(1f),
                ) { page ->
                    PassagePane(passage = state.passages[page], showsKorean = state.showsKorean)
                }

                BottomBar(
                    showsKorean = state.showsKorean,
                    onToggleKorean = viewModel::toggleKorean,
                    canPrev = pagerState.currentPage > 0,
                    canNext = pagerState.currentPage + 1 < state.passages.size,
                    onPrev = {
                        if (pagerState.currentPage > 0) viewModel.reportPageChanged(pagerState.currentPage - 1)
                    },
                    onNext = {
                        val next = pagerState.currentPage + 1
                        if (next < state.passages.size) viewModel.reportPageChanged(next)
                    },
                )
            }
        }
    }
}

@Composable
private fun Header(title: String, age: Int, cefr: String, currentIndex: Int, total: Int, onBack: () -> Unit) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 24.dp)
            .padding(top = 16.dp, bottom = 8.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            Icon(
                Icons.Filled.ChevronLeft,
                contentDescription = "Back",
                tint = SmapText,
                modifier = Modifier
                    .size(32.dp)
                    .clip(CircleShape)
                    .clickable(onClick = onBack)
                    .padding(2.dp),
            )
            Text(title, style = SmapHeadingStyle, color = SmapText, modifier = Modifier.weight(1f), maxLines = 1)
            if (total > 0) {
                Text("${currentIndex + 1} / $total", style = SmapCaptionStyle, color = SmapMuted)
            }
        }
        Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
            if (age > 0) BadgeChip(text = "${age}세", tone = BadgeTone.Neutral)
            if (cefr.isNotEmpty()) BadgeChip(text = cefr, tone = BadgeTone.Primary)
        }
        if (total > 0) {
            LinearProgressIndicator(
                progress = { (currentIndex + 1).toFloat() / total.toFloat() },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(6.dp)
                    .clip(CircleShape),
                color = SmapPrimary,
                trackColor = SmapPrimarySoft,
            )
        }
    }
}

@Composable
private fun PassagePane(passage: Passage, showsKorean: Boolean) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 24.dp, vertical = 24.dp),
        verticalArrangement = Arrangement.spacedBy(24.dp),
    ) {
        passage.sceneImagePath?.takeIf { it.isNotBlank() }?.let { path ->
            AuthenticatedAsyncImage(
                path = path,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(200.dp)
                    .clip(RoundedCornerShape(20.dp)),
                placeholder = { Box(Modifier.fillMaxSize().background(SmapPrimarySoft)) },
                failure = { Icon(Icons.Filled.MenuBook, contentDescription = null, tint = SmapPrimary.copy(alpha = 0.5f)) },
            )
        }
        Text(passage.textEn, style = SmapReaderStyle, color = SmapText)
        if (showsKorean) {
            passage.textKo?.takeIf { it.isNotBlank() }?.let { ko ->
                Divider(color = SmapBorder)
                Text(ko, style = SmapBodyStyle, color = SmapMuted)
            }
        }
    }
}

@Composable
private fun BottomBar(
    showsKorean: Boolean,
    onToggleKorean: () -> Unit,
    canPrev: Boolean,
    canNext: Boolean,
    onPrev: () -> Unit,
    onNext: () -> Unit,
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 20.dp, vertical = 16.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        ToggleChip(
            text = if (showsKorean) stringResource(R.string.reader_hide_korean) else stringResource(R.string.reader_show_korean),
            selected = showsKorean,
            onClick = onToggleKorean,
        )

        Spacer(Modifier.weight(1f))

        IconCircle(
            icon = Icons.Filled.ChevronLeft,
            background = SmapSurface,
            tint = SmapText,
            border = SmapBorder,
            enabled = canPrev,
            onClick = onPrev,
        )
        Spacer(Modifier.size(8.dp))
        IconCircle(
            icon = Icons.Filled.ChevronRight,
            background = SmapPrimary,
            tint = Color.White,
            border = Color.Transparent,
            enabled = canNext,
            onClick = onNext,
        )
    }
}

@Composable
private fun ToggleChip(text: String, selected: Boolean, onClick: () -> Unit) {
    val bg = if (selected) SmapPrimary else SmapSurface
    val fg = if (selected) Color.White else SmapText
    val borderColor = if (selected) Color.Transparent else SmapBorder
    Text(
        text = text,
        style = SmapCaptionStyle,
        color = fg,
        modifier = Modifier
            .clickable(onClick = onClick)
            .background(bg, RoundedCornerShape(percent = 50))
            .border(1.dp, borderColor, RoundedCornerShape(percent = 50))
            .padding(horizontal = 14.dp, vertical = 10.dp),
    )
}

@Composable
private fun IconCircle(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    background: Color,
    tint: Color,
    border: Color,
    enabled: Boolean,
    onClick: () -> Unit,
) {
    Box(
        modifier = Modifier
            .size(44.dp)
            .clip(CircleShape)
            .background(background)
            .border(1.dp, border, CircleShape)
            .clickable(enabled = enabled, onClick = onClick)
            .padding(10.dp),
        contentAlignment = Alignment.Center,
    ) {
        Icon(imageVector = icon, contentDescription = null, tint = tint)
    }
}
