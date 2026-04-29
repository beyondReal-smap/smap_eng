package site.smap.harubook.designsystem

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp

enum class BadgeTone { Primary, Neutral, Warn, Danger }

@Composable
fun BadgeChip(text: String, tone: BadgeTone = BadgeTone.Neutral, modifier: Modifier = Modifier) {
    val (background, foreground) = when (tone) {
        BadgeTone.Primary -> SmapPrimary to Color.White
        BadgeTone.Neutral -> SmapText.copy(alpha = 0.08f) to SmapText
        BadgeTone.Warn -> SmapWarn.copy(alpha = 0.18f) to SmapWarn
        BadgeTone.Danger -> SmapDanger.copy(alpha = 0.18f) to SmapDanger
    }
    Text(
        text = text,
        style = SmapBadgeStyle,
        color = foreground,
        modifier = modifier
            .background(background, RoundedCornerShape(percent = 50))
            .padding(horizontal = 10.dp, vertical = 5.dp),
    )
}
