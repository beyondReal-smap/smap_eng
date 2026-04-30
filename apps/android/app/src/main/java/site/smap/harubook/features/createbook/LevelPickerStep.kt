package site.smap.harubook.features.createbook

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ChevronLeft
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import site.smap.harubook.core.models.CefrLevel
import site.smap.harubook.designsystem.SmapBodyEmphasisStyle
import site.smap.harubook.designsystem.SmapBorder
import site.smap.harubook.designsystem.SmapCaptionStyle
import site.smap.harubook.designsystem.SmapHeadingStyle
import site.smap.harubook.designsystem.SmapMuted
import site.smap.harubook.designsystem.SmapPrimary
import site.smap.harubook.designsystem.SmapPrimarySoft
import site.smap.harubook.designsystem.SmapSurface
import site.smap.harubook.designsystem.SmapText
import site.smap.harubook.designsystem.SmapTitleStyle

@Composable
fun LevelPickerStep(
    selected: CefrLevel?,
    onSelect: (CefrLevel) -> Unit,
    onBack: () -> Unit,
) {
    Column(
        modifier = Modifier
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 20.dp, vertical = 24.dp),
        verticalArrangement = Arrangement.spacedBy(24.dp),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            Icon(
                Icons.Filled.ChevronLeft,
                contentDescription = "이전",
                tint = SmapText,
                modifier = Modifier
                    .size(28.dp)
                    .clickable(onClick = onBack),
            )
            Text("어떤 레벨로 만들까요?", style = SmapTitleStyle, color = SmapText)
        }
        Text(
            "아이의 영어 수준에 맞게 골라주세요. 나중에 다시 바꿀 수 있어요.",
            style = SmapCaptionStyle,
            color = SmapMuted,
        )
        CefrLevel.entries.forEach { level ->
            LevelCard(level = level, selected = level == selected, onClick = { onSelect(level) })
        }
    }
}

@Composable
private fun LevelCard(level: CefrLevel, selected: Boolean, onClick: () -> Unit) {
    val borderColor = if (selected) SmapPrimary else SmapBorder
    val borderWidth = if (selected) 2.dp else 1.dp
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .background(SmapSurface, RoundedCornerShape(20.dp))
            .border(borderWidth, borderColor, RoundedCornerShape(20.dp))
            .padding(18.dp),
        horizontalArrangement = Arrangement.spacedBy(16.dp),
        verticalAlignment = Alignment.Top,
    ) {
        Box(
            modifier = Modifier
                .size(56.dp)
                .background(if (selected) SmapPrimary else SmapPrimarySoft, CircleShape),
            contentAlignment = Alignment.Center,
        ) {
            Text(
                text = level.label,
                style = SmapHeadingStyle,
                color = if (selected) Color.White else SmapPrimary,
            )
        }
        Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
            Text(headlineFor(level), style = SmapBodyEmphasisStyle, color = SmapText)
            Text(detailFor(level), style = SmapCaptionStyle, color = SmapMuted)
        }
    }
}

private fun headlineFor(level: CefrLevel): String = when (level) {
    CefrLevel.A1 -> "A1 — 처음 시작 (5~7세)"
    CefrLevel.A2 -> "A2 — 자주 쓰는 표현 (7~9세)"
    CefrLevel.B1 -> "B1 — 자기 의견 표현 (9~10세)"
}

private fun detailFor(level: CefrLevel): String = when (level) {
    CefrLevel.A1 -> "기초 단어 · 짧은 문장 · 현재형"
    CefrLevel.A2 -> "과거형 · 일상 표현 · 간단한 접속사"
    CefrLevel.B1 -> "긴 문장 · 감정 표현 · 관계절"
}
