package site.smap.harubook.designsystem

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp

/**
 * iOS HaruBook `BadgeLabel.swift` 미러. CEFR 레벨/상태 표시용 작은 라운드 칩.
 *
 * `maxLines` + `overflow` 는 긴 텍스트(예: 책 topic) 가 칩을 늘려 부모 카드까지 비대칭으로
 * 부풀리는 문제를 막기 위해 노출. iOS `.lineLimit(1)` 패리티.
 */
@Composable
fun BadgeChip(
    text: String,
    background: Color = SmapPrimarySoft,
    foreground: Color = SmapPrimaryForeground,
    modifier: Modifier = Modifier,
    maxLines: Int = Int.MAX_VALUE,
    overflow: TextOverflow = TextOverflow.Clip,
) {
    Text(
        text = text,
        style = SmapBadgeStyle,
        color = foreground,
        maxLines = maxLines,
        overflow = overflow,
        modifier = modifier
            .background(background, RoundedCornerShape(percent = 50))
            .padding(horizontal = 10.dp, vertical = 4.dp),
    )
}
