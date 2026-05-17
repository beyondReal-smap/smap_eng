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
import androidx.compose.foundation.layout.size
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
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.unit.dp

/**
 * iOS HaruBook `PrimaryButton.swift` 미러.
 *
 * variant: filled(코랄 배경) / tonal(파스텔 배경) / outline(테두리만)
 * override 인자들은 카카오·구글·애플처럼 브랜드 컬러를 적용할 때 사용.
 */
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
    backgroundOverride: Color? = null,
    foregroundOverride: Color? = null,
    borderOverride: Color? = null,
    iconColorOverride: Color? = null,
    fontOverride: TextStyle? = null,
) {
    val background = backgroundOverride ?: when (variant) {
        PrimaryButtonVariant.Filled -> SmapPrimary
        PrimaryButtonVariant.Tonal -> SmapPrimarySoft
        PrimaryButtonVariant.Outline -> Color.Transparent
    }
    val foreground = foregroundOverride ?: SmapPrimaryForeground
    val border = borderOverride ?: if (variant == PrimaryButtonVariant.Outline) SmapPrimary else Color.Transparent
    val hasBorder = borderOverride != null || variant == PrimaryButtonVariant.Outline

    Box(
        modifier = modifier
            .fillMaxWidth()
            .heightIn(min = 52.dp)
            .alpha(if (enabled) 1f else 0.5f)
            .clickable(enabled = enabled && !isLoading, onClick = onClick)
            .background(background, RoundedCornerShape(16.dp))
            .border(
                width = if (hasBorder) 1.5.dp else 0.dp,
                color = border,
                shape = RoundedCornerShape(16.dp),
            )
            .padding(horizontal = 18.dp, vertical = 14.dp),
        contentAlignment = Alignment.Center,
    ) {
        Row(
            horizontalArrangement = Arrangement.spacedBy(10.dp, Alignment.CenterHorizontally),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            when {
                isLoading -> CircularProgressIndicator(
                    color = foreground,
                    strokeWidth = 2.dp,
                    modifier = Modifier.size(18.dp),
                )
                icon != null -> Icon(
                    imageVector = icon,
                    contentDescription = null,
                    tint = iconColorOverride ?: foreground,
                    modifier = Modifier.size(20.dp),
                )
            }
            Text(
                text = title,
                style = fontOverride ?: SmapBodyEmphasisStyle,
                color = foreground,
            )
        }
    }
}
