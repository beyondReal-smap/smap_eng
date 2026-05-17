package site.smap.harubook.features.createbook

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import site.smap.harubook.core.models.CefrLevel
import site.smap.harubook.designsystem.SmapBackground
import site.smap.harubook.designsystem.SmapBodyStyle
import site.smap.harubook.designsystem.SmapBorder
import site.smap.harubook.designsystem.SmapCaptionStyle
import site.smap.harubook.designsystem.SmapMuted
import site.smap.harubook.designsystem.SmapSurface
import site.smap.harubook.designsystem.SmapText
import site.smap.harubook.designsystem.SmapTitleStyle
import site.smap.harubook.designsystem.tint

@Composable
fun LevelPickerStep(
    genre: CreateBookViewModel.Genre?,
    selected: CefrLevel?,
    onSelect: (CefrLevel) -> Unit,
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(SmapBackground)
            .padding(horizontal = 24.dp, vertical = 16.dp),
        verticalArrangement = Arrangement.spacedBy(20.dp),
    ) {
        Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
            Text("어떤 레벨로 만들까요?", style = SmapTitleStyle, color = SmapText)
            Text(
                "아이의 영어 수준에 맞게 골라주세요. 나중에 다시 바꿀 수 있어요.",
                style = SmapBodyStyle,
                color = SmapMuted,
            )
        }
        Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
            CefrLevel.entries.forEach { level ->
                LevelCard(level = level, selected = selected == level, onClick = { onSelect(level) })
            }
        }
    }
}

@Composable
private fun LevelCard(level: CefrLevel, selected: Boolean, onClick: () -> Unit) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .background(if (selected) level.tint else SmapSurface, RoundedCornerShape(18.dp))
            .border(
                width = if (selected) 0.dp else 1.dp,
                color = if (selected) Color.Transparent else SmapBorder,
                shape = RoundedCornerShape(18.dp),
            )
            .padding(18.dp),
        verticalArrangement = Arrangement.spacedBy(6.dp),
    ) {
        Text(level.label, style = SmapTitleStyle, color = SmapText)
        Text(level.hint(), style = SmapCaptionStyle, color = SmapMuted)
    }
}

private fun CefrLevel.hint(): String = when (this) {
    CefrLevel.A1 -> "5~6세 추천 · 짧은 문장, 기초 어휘"
    CefrLevel.A2 -> "7~8세 추천 · 과거형, 간단한 접속사"
    CefrLevel.B1 -> "9~10세 추천 · 관계절, 감정 표현"
    CefrLevel.B2 -> "더 도전적인 어휘와 길이"
}
