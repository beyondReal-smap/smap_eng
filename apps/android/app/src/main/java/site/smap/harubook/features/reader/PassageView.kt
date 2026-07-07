package site.smap.harubook.features.reader

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
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
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.MenuBook
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.IntRect
import androidx.compose.ui.unit.IntSize
import androidx.compose.ui.unit.LayoutDirection
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Popup
import androidx.compose.ui.window.PopupPositionProvider
import androidx.compose.ui.window.PopupProperties
import site.smap.harubook.core.models.Mission
import site.smap.harubook.core.models.Passage
import site.smap.harubook.core.models.VocabularyEntry
import site.smap.harubook.core.srs.SrsGrade
import site.smap.harubook.designsystem.PrimaryButton
import site.smap.harubook.designsystem.PrimaryButtonVariant
import site.smap.harubook.designsystem.SmapBodyStyle
import site.smap.harubook.designsystem.AuthenticatedAsyncImage
import site.smap.harubook.designsystem.SmapBackground
import site.smap.harubook.designsystem.SmapBodyEmphasisStyle
import site.smap.harubook.designsystem.SmapBorder
import site.smap.harubook.designsystem.SmapMuted
import site.smap.harubook.designsystem.SmapMutedBg
import site.smap.harubook.designsystem.SmapPrimary
import site.smap.harubook.designsystem.SmapPrimarySoft
import site.smap.harubook.designsystem.SmapReaderStyle
import site.smap.harubook.designsystem.SmapSurface
import site.smap.harubook.designsystem.SmapText

/**
 * iOS `PassageView.swift` 미러. 장면 이미지(있을 때) + 영문 본문 + 한글 카드(토글) 구성.
 * 본문은 vocabulary 매칭 단어를 클릭 가능한 토큰으로 분해해 인라인 강조한다.
 */
@Composable
fun PassageView(
    passage: Passage,
    vocabulary: List<VocabularyEntry>,
    showsKorean: Boolean,
    isPlaying: Boolean,
    textScale: ReaderTextScale,
    generatingScene: Boolean,
    onGradeVocab: (VocabularyEntry, SrsGrade) -> Unit,
    modifier: Modifier = Modifier,
    /** 이 passage의 미션 — 없으면(레거시 책) 미션 UI 미노출. 웹 passage-mission 패리티. */
    mission: Mission? = null,
    missionDone: Boolean = false,
    onMissionComplete: () -> Unit = {},
    /** 밑줄 단어 popover 열림 시 원본 단어 전달 — 워드 헌트 완료 판정용. */
    onWordTap: (String) -> Unit = {},
) {
    Column(
        modifier = modifier
            .fillMaxSize()
            .background(SmapBackground)
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 24.dp, vertical = 24.dp),
        verticalArrangement = Arrangement.spacedBy(24.dp),
    ) {
        // iOS PassageView.sceneSection 패리티 — 장면 이미지 경로가 있을 때만 영역 노출.
        // 없으면 자리를 비워두고 본문에 집중한다. 이전엔 path 가 없어도 회색 박스 + 책 아이콘
        // placeholder 가 항상 떠 있어 본문 위에 빈 영역이 생겼다.
        if (!passage.sceneImagePath.isNullOrEmpty() || generatingScene) {
            SceneSection(passage = passage, isGenerating = generatingScene)
        }

        PassageBody(
            text = passage.textEn,
            vocabulary = vocabulary,
            isPlaying = isPlaying,
            textScale = textScale,
            onGradeVocab = onGradeVocab,
            onWordTap = onWordTap,
        )

        // 책 속 미션 — 웹과 동일하게 본문 아래·한글 카드 위. 진행을 막지 않는 재미 요소.
        if (mission != null) {
            PassageMissionCard(
                mission = mission,
                done = missionDone,
                onComplete = onMissionComplete,
            )
        }

        if (showsKorean && !passage.textKo.isNullOrEmpty()) {
            KoreanCard(textKo = passage.textKo, baseSp = textScale.sp)
        }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun PassageBody(
    text: String,
    vocabulary: List<VocabularyEntry>,
    isPlaying: Boolean,
    textScale: ReaderTextScale,
    onGradeVocab: (VocabularyEntry, SrsGrade) -> Unit,
    onWordTap: (String) -> Unit,
) {
    val vocabMap = remember(vocabulary) { buildVocabMap(vocabulary) }
    val tokens = remember(text) { tokenizePassage(text) }
    val bodyStyle = SmapReaderStyle.copy(
        fontSize = textScale.sp.sp,
        lineHeight = (textScale.sp + 10).sp,
    )

    FlowRow(
        modifier = Modifier
            .fillMaxWidth()
            .background(
                if (isPlaying) SmapPrimarySoft else Color.Transparent,
                RoundedCornerShape(12.dp),
            )
            .padding(12.dp),
    ) {
        tokens.forEach { token ->
            val match = if (token.isWord) vocabMap[normalizeVocabKey(token.text)] else null
            if (match != null) {
                // 인라인 Popup 호스트 — 단어 자체를 anchor 로 사용해 iOS popover(arrowEdge:.top) 처럼
                // 단어 바로 위에 뜻이 뜨도록. 이전엔 padding(vertical=6,horizontal=2) 로 hit area 를
                // 넓혀 줄 높이가 일반 토큰과 어긋났고, 뜻은 화면 하단 ModalBottomSheet 로 떠 단어와
                // 시각적으로 멀어졌다.
                VocabTokenWithPopup(
                    displayWord = token.text,
                    entry = match,
                    bodyStyle = bodyStyle,
                    onGrade = { grade -> onGradeVocab(match, grade) },
                    // popover 열림 = "단어를 찾았다" 신호 — 워드 헌트 완료 판정(웹 handleWordTap 패리티).
                    onOpen = { onWordTap(token.text) },
                )
            } else {
                Text(text = token.text, style = bodyStyle, color = SmapText)
            }
        }
    }
}

/**
 * vocab 단어 토큰 — 일반 텍스트와 같은 baseline·line-height 를 유지하면서, 탭 시 토큰 바로 위에
 * [Popup] 으로 뜻 카드를 표시한다. iOS `VocabWord` + `popover(arrowEdge:.top)` 패리티.
 */
@Composable
private fun VocabTokenWithPopup(
    displayWord: String,
    entry: VocabularyEntry,
    bodyStyle: androidx.compose.ui.text.TextStyle,
    onGrade: (SrsGrade) -> Unit,
    onOpen: () -> Unit = {},
) {
    var shows by remember { mutableStateOf(false) }
    Box {
        Text(
            text = displayWord,
            style = bodyStyle.copy(textDecoration = TextDecoration.Underline),
            color = SmapPrimary,
            modifier = Modifier.clickable {
                shows = true
                onOpen()
            },
        )
        if (shows) {
            // 카드 실측 크기 기반으로 "단어 바로 위 + 화면 안"에 배치.
            // 이전의 고정 offset(-200)은 dp가 아닌 raw 픽셀이라 기기 밀도에 따라
            // 카드가 단어를 덮거나(고밀도) 엉뚱하게 멀리 떠서(저밀도) 오조작을 유발했다.
            val gapPx = with(LocalDensity.current) { 8.dp.roundToPx() }
            val positionProvider = remember(gapPx) {
                object : PopupPositionProvider {
                    override fun calculatePosition(
                        anchorBounds: IntRect,
                        windowSize: IntSize,
                        layoutDirection: LayoutDirection,
                        popupContentSize: IntSize,
                    ): IntOffset {
                        val x = (anchorBounds.left + (anchorBounds.width - popupContentSize.width) / 2)
                            .coerceIn(0, (windowSize.width - popupContentSize.width).coerceAtLeast(0))
                        // 기본은 단어 위, 화면 상단을 벗어나면 단어 아래로 반전.
                        val above = anchorBounds.top - popupContentSize.height - gapPx
                        val y = if (above >= 0) above else anchorBounds.bottom + gapPx
                        return IntOffset(x, y)
                    }
                }
            }
            Popup(
                popupPositionProvider = positionProvider,
                onDismissRequest = { shows = false },
                properties = PopupProperties(focusable = true),
            ) {
                VocabPopoverCard(
                    entry = entry,
                    onGrade = { g ->
                        shows = false
                        onGrade(g)
                    },
                )
            }
        }
    }
}

/**
 * popover 안에 들어가는 카드 — 단어 + 뜻 + 평가 2버튼. iOS popover content 패리티.
 */
@Composable
private fun VocabPopoverCard(
    entry: VocabularyEntry,
    onGrade: (SrsGrade) -> Unit,
) {
    Column(
        modifier = Modifier
            // 카드 폭을 240~280 으로 제한 — 화면 폭 전체를 채워 본문을 덮지 않도록. iOS popover 패리티.
            .widthIn(min = 240.dp, max = 280.dp)
            .background(SmapSurface, RoundedCornerShape(14.dp))
            .border(1.dp, SmapBorder, RoundedCornerShape(14.dp))
            .padding(horizontal = 16.dp, vertical = 14.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        Text(entry.word, style = SmapBodyEmphasisStyle, color = SmapPrimary)
        Text(entry.meaning, style = SmapBodyStyle, color = SmapText)
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
            PrimaryButton(
                title = "몰라요",
                variant = PrimaryButtonVariant.Outline,
                onClick = { onGrade(SrsGrade.Again) },
                modifier = Modifier.weight(1f),
            )
            PrimaryButton(
                title = "알아요",
                onClick = { onGrade(SrsGrade.Good) },
                modifier = Modifier.weight(1f),
            )
        }
    }
}

@Composable
private fun SceneSection(passage: Passage, isGenerating: Boolean) {
    val path = passage.sceneImagePath
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .height(220.dp)
            .background(SmapMutedBg, RoundedCornerShape(16.dp)),
        contentAlignment = Alignment.Center,
    ) {
        when {
            !path.isNullOrEmpty() -> AuthenticatedAsyncImage(
                path = path,
                modifier = Modifier.fillMaxSize(),
                placeholder = { CircularProgressIndicator(color = SmapPrimary) },
                failure = { Icon(Icons.AutoMirrored.Filled.MenuBook, contentDescription = null, tint = SmapMuted) },
            )
            isGenerating -> Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                CircularProgressIndicator(color = SmapPrimary, strokeWidth = 2.dp)
                Text("삽화를 그리는 중…", style = SmapBodyEmphasisStyle, color = SmapMuted)
            }
            else -> Icon(
                Icons.AutoMirrored.Filled.MenuBook,
                contentDescription = null,
                tint = SmapMuted,
                modifier = Modifier.size(40.dp),
            )
        }
    }
}

@Composable
private fun KoreanCard(textKo: String, baseSp: Int) {
    val koSize = (baseSp * 0.72).toInt().coerceIn(16, 24)
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .background(SmapMutedBg, RoundedCornerShape(22.dp))
            .border(1.dp, SmapBorder, RoundedCornerShape(22.dp))
            .padding(18.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        Row(
            modifier = Modifier
                .background(SmapSurface, RoundedCornerShape(percent = 50))
                .border(1.dp, SmapBorder, RoundedCornerShape(percent = 50))
                .padding(horizontal = 10.dp, vertical = 5.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(6.dp),
        ) {
            Icon(
                Icons.AutoMirrored.Filled.MenuBook,
                contentDescription = null,
                tint = SmapMuted,
                modifier = Modifier.size(14.dp),
            )
            Text("한글 해석", style = SmapBodyEmphasisStyle.copy(fontSize = 12.sp), color = SmapMuted)
        }
        Spacer(Modifier.height(0.dp))
        Text(
            text = textKo,
            style = SmapReaderStyle.copy(fontSize = koSize.sp, lineHeight = (koSize + 6).sp),
            color = SmapText,
        )
    }
}
