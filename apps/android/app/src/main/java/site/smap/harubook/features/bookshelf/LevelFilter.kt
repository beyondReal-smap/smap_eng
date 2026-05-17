package site.smap.harubook.features.bookshelf

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import site.smap.harubook.core.models.CefrLevel
import site.smap.harubook.designsystem.SmapBadgeStyle
import site.smap.harubook.designsystem.SmapBorder
import site.smap.harubook.designsystem.SmapMuted
import site.smap.harubook.designsystem.SmapPrimaryForeground
import site.smap.harubook.designsystem.SmapSurface
import site.smap.harubook.designsystem.SmapText
import site.smap.harubook.designsystem.tint

@Composable
fun LevelFilter(
    selected: CefrLevel?,
    onChange: (CefrLevel?) -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(modifier = modifier, verticalArrangement = Arrangement.spacedBy(10.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text("레벨", style = SmapBadgeStyle, color = SmapMuted)
            Box(modifier = Modifier.weight(1f))
            if (selected != null) {
                Text(
                    "초기화",
                    style = SmapBadgeStyle,
                    color = SmapPrimaryForeground,
                    modifier = Modifier.clickable { onChange(null) },
                )
            }
        }

        Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
            CefrLevel.entries.forEach { level ->
                val isSelected = selected == level
                Box(
                    modifier = Modifier
                        .clickable { onChange(if (isSelected) null else level) }
                        .background(
                            if (isSelected) level.tint else SmapSurface,
                            RoundedCornerShape(percent = 50),
                        )
                        .border(
                            width = if (isSelected) 0.dp else 1.dp,
                            color = if (isSelected) Color.Transparent else SmapBorder,
                            shape = RoundedCornerShape(percent = 50),
                        )
                        .padding(horizontal = 16.dp, vertical = 8.dp),
                ) {
                    Text(level.label, style = SmapBadgeStyle, color = SmapText)
                }
            }
        }
    }
}
