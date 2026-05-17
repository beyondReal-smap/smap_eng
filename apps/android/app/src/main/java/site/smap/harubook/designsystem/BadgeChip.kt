package site.smap.harubook.designsystem

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp

/**
 * iOS HaruBook `BadgeLabel.swift` 미러. CEFR 레벨/상태 표시용 작은 라운드 칩.
 */
@Composable
fun BadgeChip(
    text: String,
    background: Color = SmapPrimarySoft,
    foreground: Color = SmapPrimaryForeground,
    modifier: Modifier = Modifier,
) {
    Text(
        text = text,
        style = SmapBadgeStyle,
        color = foreground,
        modifier = modifier
            .background(background, RoundedCornerShape(percent = 50))
            .padding(horizontal = 10.dp, vertical = 4.dp),
    )
}
