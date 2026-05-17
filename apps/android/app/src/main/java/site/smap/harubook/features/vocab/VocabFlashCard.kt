package site.smap.harubook.features.vocab

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.defaultMinSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.runtime.getValue
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.GraphicEq
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.School
import androidx.compose.material.icons.filled.VolumeUp
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import site.smap.harubook.core.models.VocabEntry
import site.smap.harubook.core.srs.VocabCardState
import site.smap.harubook.designsystem.A2zFontFamily
import site.smap.harubook.designsystem.SmapBadgeStyle
import site.smap.harubook.designsystem.SmapBodyEmphasisStyle
import site.smap.harubook.designsystem.SmapBorder
import site.smap.harubook.designsystem.SmapCaptionStyle
import site.smap.harubook.designsystem.SmapDanger
import site.smap.harubook.designsystem.SmapMuted
import site.smap.harubook.designsystem.SmapPrimary
import site.smap.harubook.designsystem.SmapPrimarySoft
import site.smap.harubook.designsystem.SmapSurface
import site.smap.harubook.designsystem.SmapText

/**
 * 단어장 플래시카드 — iOS `VocabCardView.swift` 미러.
 *
 * Y축 180° 회전 애니메이션으로 영어 ↔ 한글 뜻 전환.
 * 카드 좌상단 학습 상태 칩(NEW/다시 학습/Lv.N)은 회전 바깥 overlay 에 두어
 * 회전과 함께 뒤집히지 않고 학습 상태가 항상 보인다.
 */
@Composable
fun VocabFlashCard(
    entry: VocabEntry,
    cardState: VocabCardState,
    level: Int,
    isFlipped: Boolean,
    isSpeaking: Boolean,
    onSpeak: () -> Unit,
    onFlip: () -> Unit,
    modifier: Modifier = Modifier,
) {
    // 0f → 0deg(front), 1f → 180deg(back). tween 400ms 는 iOS easeInOut 과 동일 톤.
    val flipProgress by animateFloatAsState(
        targetValue = if (isFlipped) 1f else 0f,
        animationSpec = tween(durationMillis = 400),
        label = "flip",
    )
    val rotationY = flipProgress * 180f
    // 90도 지점에서 face 가 자연스레 교차. 약간의 hysteresis 로 깜빡임 방지.
    val showBack = flipProgress > 0.5f

    val interactionSource = remember { MutableInteractionSource() }

    Box(modifier = modifier.fillMaxWidth()) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .defaultMinSize(minHeight = 240.dp)
                .graphicsLayer {
                    this.rotationY = rotationY
                    // iOS perspective 0.6 ≈ cameraDistance density 환산. 8 * density 가 자연스러운 깊이감.
                    this.cameraDistance = 12f * density
                }
                .background(SmapSurface, RoundedCornerShape(24.dp))
                .border(1.dp, SmapBorder, RoundedCornerShape(24.dp))
                .clickable(
                    interactionSource = interactionSource,
                    indication = null,
                    onClick = onFlip,
                )
                .padding(28.dp),
            contentAlignment = Alignment.Center,
        ) {
            // 두 face 를 alpha 로 교차 — 뒷면은 회전 보정으로 좌우 반전 방지.
            Box(modifier = Modifier.alpha(if (showBack) 0f else 1f)) {
                CardFront(
                    entry = entry,
                    isSpeaking = isSpeaking,
                    onSpeak = onSpeak,
                )
            }
            Box(
                modifier = Modifier
                    .alpha(if (showBack) 1f else 0f)
                    .graphicsLayer { this.rotationY = 180f },
            ) {
                CardBack(entry = entry)
            }
        }

        // 학습 상태 칩 — 회전 바깥 overlay. 좌상단 고정. mastered 는 deck 에서 빠지므로 표시 없음.
        when (cardState) {
            VocabCardState.New -> StateChip(
                label = "NEW",
                icon = Icons.Filled.AutoAwesome,
                fg = Color(0xFF1E6FB8),
                bg = Color(0xFFE2F0FB),
                modifier = Modifier.padding(top = 12.dp, start = 12.dp),
            )
            VocabCardState.Relearning -> StateChip(
                label = "다시 학습",
                icon = Icons.Filled.Refresh,
                fg = SmapDanger,
                bg = Color(0xFFFDE2DD),
                modifier = Modifier.padding(top = 12.dp, start = 12.dp),
            )
            VocabCardState.Learning -> StateChip(
                label = "Lv.$level",
                icon = Icons.Filled.School,
                fg = Color(0xFF8A6300),
                bg = Color(0xFFFCEDC1),
                modifier = Modifier.padding(top = 12.dp, start = 12.dp),
            )
            VocabCardState.Mastered -> {} // deck 에서 빠짐
        }
    }
}

@Composable
private fun CardFront(
    entry: VocabEntry,
    isSpeaking: Boolean,
    onSpeak: () -> Unit,
) {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(18.dp),
        modifier = Modifier.fillMaxWidth(),
    ) {
        Text(
            text = entry.word,
            fontSize = 36.sp,
            fontWeight = FontWeight.Bold,
            fontFamily = FontFamily.Default,
            color = SmapText,
            textAlign = TextAlign.Center,
        )

        // 발음 듣기 — pill, 비활성 시 isSpeaking 표시(waveform 아이콘 교체).
        Row(
            horizontalArrangement = Arrangement.spacedBy(6.dp),
            verticalAlignment = Alignment.CenterVertically,
            modifier = Modifier
                .background(SmapPrimarySoft, CircleShape)
                .clickable(enabled = !isSpeaking, onClick = onSpeak)
                .padding(horizontal = 14.dp, vertical = 8.dp),
        ) {
            Icon(
                imageVector = if (isSpeaking) Icons.Filled.GraphicEq else Icons.Filled.VolumeUp,
                contentDescription = null,
                tint = SmapPrimary,
                modifier = Modifier.height(16.dp),
            )
            Text(
                text = "발음 듣기",
                style = SmapCaptionStyle,
                color = SmapPrimary,
            )
        }

        Text(
            text = "탭해서 뜻 보기",
            style = SmapCaptionStyle,
            color = SmapMuted,
        )
    }
}

@Composable
private fun CardBack(entry: VocabEntry) {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(12.dp),
        modifier = Modifier.fillMaxWidth(),
    ) {
        Text(text = entry.word, style = SmapBodyEmphasisStyle, color = SmapMuted)
        Text(
            text = entry.meaning,
            fontSize = 22.sp,
            fontWeight = FontWeight.SemiBold,
            fontFamily = A2zFontFamily,
            color = SmapText,
            textAlign = TextAlign.Center,
            modifier = Modifier.padding(horizontal = 8.dp),
        )
        Spacer(Modifier.height(4.dp))
        Text(text = entry.bookTitle, style = SmapCaptionStyle, color = SmapMuted)
    }
}

@Composable
private fun StateChip(
    label: String,
    icon: ImageVector,
    fg: Color,
    bg: Color,
    modifier: Modifier = Modifier,
) {
    Row(
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(4.dp),
        modifier = modifier
            .background(bg, CircleShape)
            .padding(horizontal = 8.dp, vertical = 4.dp),
    ) {
        Icon(imageVector = icon, contentDescription = null, tint = fg, modifier = Modifier.height(12.dp))
        Text(text = label, style = SmapBadgeStyle, color = fg)
    }
}
