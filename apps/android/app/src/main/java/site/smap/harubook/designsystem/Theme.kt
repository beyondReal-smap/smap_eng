package site.smap.harubook.designsystem

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable

private val SmapColorScheme = lightColorScheme(
    primary = SmapPrimary,
    onPrimary = SmapPrimaryForeground,
    primaryContainer = SmapPrimarySoft,
    onPrimaryContainer = SmapPrimaryForeground,
    background = SmapBackground,
    onBackground = SmapText,
    surface = SmapSurface,
    onSurface = SmapText,
    surfaceVariant = SmapMutedBg,
    onSurfaceVariant = SmapMuted,
    outline = SmapBorder,
    error = SmapDanger,
)

@Composable
fun HaruBookTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = SmapColorScheme,
        typography = SmapTypography,
        content = content,
    )
}
