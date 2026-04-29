package site.smap.harubook.features.bookshelf

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import site.smap.harubook.R
import site.smap.harubook.core.models.CefrLevel
import site.smap.harubook.designsystem.SmapBadgeStyle
import site.smap.harubook.designsystem.SmapBorder
import site.smap.harubook.designsystem.SmapCaptionStyle
import site.smap.harubook.designsystem.SmapMuted
import site.smap.harubook.designsystem.SmapPrimary
import site.smap.harubook.designsystem.SmapSurface
import site.smap.harubook.designsystem.SmapText

private val Ages = (5..10).toList()

@Composable
fun LevelFilter(
    selectedAge: Int?,
    selectedCefr: CefrLevel?,
    onAgeChange: (Int?) -> Unit,
    onCefrChange: (CefrLevel?) -> Unit,
    onReset: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(modifier = modifier, verticalArrangement = Arrangement.spacedBy(10.dp)) {
        Row(verticalAlignment = androidx.compose.ui.Alignment.CenterVertically) {
            Text(stringResource(R.string.filter_age), style = SmapCaptionStyle, color = SmapMuted)
            Spacer(Modifier.weight(1f))
            if (selectedAge != null || selectedCefr != null) {
                Text(
                    text = stringResource(R.string.filter_reset),
                    style = SmapCaptionStyle,
                    color = SmapPrimary,
                    modifier = Modifier.clickable(onClick = onReset),
                )
            }
        }
        Row(
            modifier = Modifier.horizontalScroll(rememberScrollState()),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            Ages.forEach { age ->
                Chip(
                    text = "${age}세",
                    selected = selectedAge == age,
                    onClick = { onAgeChange(if (selectedAge == age) null else age) },
                )
            }
        }
        Text(stringResource(R.string.filter_level), style = SmapCaptionStyle, color = SmapMuted)
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            CefrLevel.entries.forEach { level ->
                Chip(
                    text = level.label,
                    selected = selectedCefr == level,
                    onClick = { onCefrChange(if (selectedCefr == level) null else level) },
                )
            }
        }
    }
}

@Composable
private fun Chip(text: String, selected: Boolean, onClick: () -> Unit) {
    val bg = if (selected) SmapPrimary else SmapSurface
    val fg = if (selected) Color.White else SmapText
    val borderColor = if (selected) Color.Transparent else SmapBorder
    Text(
        text = text,
        style = SmapBadgeStyle,
        color = fg,
        modifier = Modifier
            .clickable(onClick = onClick)
            .background(bg, RoundedCornerShape(percent = 50))
            .border(1.dp, borderColor, RoundedCornerShape(percent = 50))
            .padding(horizontal = 14.dp, vertical = 8.dp),
    )
}
