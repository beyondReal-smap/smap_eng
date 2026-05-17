package site.smap.harubook.features.parents

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import site.smap.harubook.core.models.ParentalProfileReport
import site.smap.harubook.designsystem.SmapBackground
import site.smap.harubook.designsystem.SmapBodyEmphasisStyle
import site.smap.harubook.designsystem.SmapBodyStyle
import site.smap.harubook.designsystem.SmapBorder
import site.smap.harubook.designsystem.SmapCaptionStyle
import site.smap.harubook.designsystem.SmapHeadingStyle
import site.smap.harubook.designsystem.SmapMuted
import site.smap.harubook.designsystem.SmapPrimarySoft
import site.smap.harubook.designsystem.SmapSurface
import site.smap.harubook.designsystem.SmapText
import site.smap.harubook.designsystem.SmapWarn

@Composable
fun ProfileReportCard(report: ParentalProfileReport) {
    Column(
        verticalArrangement = Arrangement.spacedBy(16.dp),
        modifier = Modifier
            .fillMaxWidth()
            .background(SmapSurface, RoundedCornerShape(20.dp))
            .border(1.dp, SmapBorder, RoundedCornerShape(20.dp))
            .padding(18.dp),
    ) {
        Header(report)
        WeeklyStats(report)
        CumulativeStats(report)
        if (report.flaggedBooks.isNotEmpty()) {
            HorizontalDivider(color = SmapBorder)
            FlaggedSection(report)
        }
    }
}

@Composable
private fun Header(report: ParentalProfileReport) {
    Row(
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Box(
            modifier = Modifier.size(48.dp).background(SmapPrimarySoft, CircleShape),
            contentAlignment = Alignment.Center,
        ) {
            Text(
                text = report.avatar?.takeIf { it.isNotEmpty() } ?: report.name.take(1),
                style = SmapHeadingStyle,
            )
        }
        Column {
            Text(report.name, style = SmapHeadingStyle, color = SmapText)
            Text("${report.activeDays.size}일 활동", style = SmapCaptionStyle, color = SmapMuted)
        }
    }
}

@Composable
private fun WeeklyStats(report: ParentalProfileReport) {
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        SectionLabel("이번 주")
        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            StatTile("만든 책", "${report.booksCreatedWeek}", "권", Modifier.weight(1f))
            StatTile("완독 세션", "${report.sessionsFinishedWeek}", "회", Modifier.weight(1f))
            val acc = report.averageAccuracyWeek
            StatTile(
                "평균 정답률",
                acc?.let { "${(it * 100).toInt()}" } ?: "—",
                if (acc == null) "" else "%",
                Modifier.weight(1f),
            )
        }
    }
}

@Composable
private fun CumulativeStats(report: ParentalProfileReport) {
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        SectionLabel("누적")
        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            StatTile("읽은 책", "${report.totalBooks}", "권", Modifier.weight(1f))
            StatTile("만점", "${report.totalPerfect}", "회", Modifier.weight(1f))
            Box(modifier = Modifier.weight(1f))
        }
    }
}

@Composable
private fun FlaggedSection(report: ParentalProfileReport) {
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
            Icon(Icons.Filled.Warning, contentDescription = null, tint = SmapWarn)
            Text("신고된 책 ${report.flaggedBooks.size}권", style = SmapBodyEmphasisStyle, color = SmapText)
        }
        report.flaggedBooks.forEach { book ->
            Column(verticalArrangement = Arrangement.spacedBy(2.dp), modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp)) {
                Text(book.title, style = SmapBodyStyle, color = SmapText, maxLines = 1)
                if (!book.reason.isNullOrBlank()) {
                    Text(book.reason, style = SmapCaptionStyle, color = SmapMuted, maxLines = 2)
                }
            }
        }
    }
}

@Composable
private fun SectionLabel(text: String) {
    Text(text, style = SmapCaptionStyle, color = SmapMuted)
}

@Composable
private fun StatTile(label: String, value: String, unit: String, modifier: Modifier = Modifier) {
    Column(
        verticalArrangement = Arrangement.spacedBy(4.dp),
        modifier = modifier.background(SmapBackground, RoundedCornerShape(12.dp)).padding(10.dp),
    ) {
        Text(label, style = SmapCaptionStyle, color = SmapMuted)
        Row(verticalAlignment = Alignment.Bottom, horizontalArrangement = Arrangement.spacedBy(2.dp)) {
            Text(value, style = SmapHeadingStyle, color = SmapText)
            Text(unit, style = SmapCaptionStyle, color = SmapMuted)
        }
    }
}
