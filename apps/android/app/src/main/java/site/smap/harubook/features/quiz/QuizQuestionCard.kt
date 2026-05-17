package site.smap.harubook.features.quiz

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import site.smap.harubook.core.models.Quiz
import site.smap.harubook.designsystem.SmapBodyEmphasisStyle
import site.smap.harubook.designsystem.SmapBodyStyle
import site.smap.harubook.designsystem.SmapBorder
import site.smap.harubook.designsystem.SmapCaptionStyle
import site.smap.harubook.designsystem.SmapMuted
import site.smap.harubook.designsystem.SmapPrimary
import site.smap.harubook.designsystem.SmapPrimaryForeground
import site.smap.harubook.designsystem.SmapPrimarySoft
import site.smap.harubook.designsystem.SmapSurface
import site.smap.harubook.designsystem.SmapText
import site.smap.harubook.designsystem.SmapTitleStyle

/**
 * 4지선다 1문제 카드. 선택 시 [onSelect] 호출, 선택된 항목은 코랄 강조.
 */
@Composable
fun QuizQuestionCard(
    quiz: Quiz,
    index: Int,
    total: Int,
    selected: Int?,
    onSelect: (Int) -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(
        modifier = modifier
            .fillMaxWidth()
            .background(SmapSurface, RoundedCornerShape(20.dp))
            .border(1.dp, SmapBorder, RoundedCornerShape(20.dp))
            .padding(20.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        Text("${index + 1} / $total", style = SmapCaptionStyle, color = SmapMuted)
        Text(quiz.question, style = SmapTitleStyle, color = SmapText)

        Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
            quiz.choices.forEachIndexed { i, choice ->
                ChoiceRow(
                    letter = ('A' + i).toString(),
                    text = choice,
                    selected = selected == i,
                    onClick = { onSelect(i) },
                )
            }
        }
    }
}

@Composable
private fun ChoiceRow(
    letter: String,
    text: String,
    selected: Boolean,
    onClick: () -> Unit,
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .background(
                if (selected) SmapPrimarySoft else SmapSurface,
                RoundedCornerShape(14.dp),
            )
            .border(
                width = if (selected) 0.dp else 1.dp,
                color = if (selected) Color.Transparent else SmapBorder,
                shape = RoundedCornerShape(14.dp),
            )
            .padding(horizontal = 14.dp, vertical = 14.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        androidx.compose.foundation.layout.Box(
            modifier = Modifier
                .size(28.dp)
                .background(
                    if (selected) SmapPrimary else SmapPrimarySoft,
                    CircleShape,
                ),
            contentAlignment = Alignment.Center,
        ) {
            Text(
                letter,
                style = SmapBodyEmphasisStyle,
                color = if (selected) SmapPrimaryForeground else SmapPrimary,
            )
        }
        Text(text, style = SmapBodyStyle, color = SmapText)
    }
}
