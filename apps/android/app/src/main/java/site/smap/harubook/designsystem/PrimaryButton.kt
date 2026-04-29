package site.smap.harubook.designsystem

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.unit.dp

enum class PrimaryButtonVariant { Filled, Tonal, Outline }

@Composable
fun PrimaryButton(
    title: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    icon: ImageVector? = null,
    variant: PrimaryButtonVariant = PrimaryButtonVariant.Filled,
    isLoading: Boolean = false,
    enabled: Boolean = true,
) {
    val (background, foreground, borderColor) = when (variant) {
        PrimaryButtonVariant.Filled -> Triple(SmapPrimary, Color.White, Color.Transparent)
        PrimaryButtonVariant.Tonal -> Triple(SmapPrimarySoft, SmapPrimary, Color.Transparent)
        PrimaryButtonVariant.Outline -> Triple(Color.Transparent, SmapPrimary, SmapPrimary)
    }

    Box(
        modifier = modifier
            .fillMaxWidth()
            .heightIn(min = 52.dp)
            .alpha(if (enabled) 1f else 0.5f)
            .clickable(enabled = enabled && !isLoading, onClick = onClick)
            .background(background, RoundedCornerShape(16.dp))
            .border(
                width = if (variant == PrimaryButtonVariant.Outline) 1.5.dp else 0.dp,
                color = borderColor,
                shape = RoundedCornerShape(16.dp),
            )
            .padding(horizontal = 18.dp, vertical = 14.dp),
        contentAlignment = Alignment.Center,
    ) {
        Row(
            horizontalArrangement = Arrangement.spacedBy(10.dp, Alignment.CenterHorizontally),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            if (isLoading) {
                CircularProgressIndicator(
                    modifier = Modifier.padding(end = 4.dp),
                    color = foreground,
                    strokeWidth = 2.dp,
                )
            } else if (icon != null) {
                Icon(imageVector = icon, contentDescription = null, tint = foreground)
            }
            Text(text = title, style = SmapBodyEmphasisStyle, color = foreground)
        }
    }
}
