package site.smap.harubook.features.reader

import androidx.compose.foundation.background
import androidx.compose.foundation.border
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
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.MenuBook
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import site.smap.harubook.core.models.Passage
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
 *
 * 본문 단어 popover(vocabulary 매칭 ClickableText)는 Phase 4 범위 밖 — 후속 트랙으로 분리.
 */
@Composable
fun PassageView(
    passage: Passage,
    showsKorean: Boolean,
    isPlaying: Boolean,
    textScale: ReaderTextScale,
    generatingScene: Boolean,
    modifier: Modifier = Modifier,
) {
    Column(
        modifier = modifier
            .fillMaxSize()
            .background(SmapBackground)
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 24.dp, vertical = 24.dp),
        verticalArrangement = Arrangement.spacedBy(24.dp),
    ) {
        SceneSection(passage = passage, isGenerating = generatingScene)

        Text(
            text = passage.textEn,
            style = SmapReaderStyle.copy(fontSize = textScale.sp.sp, lineHeight = (textScale.sp + 10).sp),
            color = SmapText,
            modifier = Modifier
                .fillMaxWidth()
                .background(
                    if (isPlaying) SmapPrimarySoft else Color.Transparent,
                    RoundedCornerShape(12.dp),
                )
                .padding(12.dp),
        )

        if (showsKorean && !passage.textKo.isNullOrEmpty()) {
            KoreanCard(textKo = passage.textKo, baseSp = textScale.sp)
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
                failure = { Icon(Icons.Filled.MenuBook, contentDescription = null, tint = SmapMuted) },
            )
            isGenerating -> Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                CircularProgressIndicator(color = SmapPrimary, strokeWidth = 2.dp)
                Text("삽화를 그리는 중…", style = SmapBodyEmphasisStyle, color = SmapMuted)
            }
            else -> Icon(
                Icons.Filled.MenuBook,
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
                Icons.Filled.MenuBook,
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
