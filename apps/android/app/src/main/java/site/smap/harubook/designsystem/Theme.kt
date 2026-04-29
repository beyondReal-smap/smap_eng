package site.smap.harubook.designsystem

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable

private val HaruBookColorScheme = lightColorScheme(
    primary = SmapPrimary,
    onPrimary = SmapSurface,
    primaryContainer = SmapPrimarySoft,
    onPrimaryContainer = SmapPrimary,
    background = SmapBackground,
    onBackground = SmapText,
    surface = SmapSurface,
    onSurface = SmapText,
    surfaceVariant = SmapPrimarySoft,
    onSurfaceVariant = SmapText,
    outline = SmapBorder,
    error = SmapDanger,
)

@Composable
fun HaruBookTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = HaruBookColorScheme,
        typography = SmapTypography,
        content = content,
    )
}
