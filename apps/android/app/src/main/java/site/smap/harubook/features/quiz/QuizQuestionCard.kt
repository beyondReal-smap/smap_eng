package site.smap.harubook.features.quiz

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
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
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Cancel
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import site.smap.harubook.core.models.Quiz
import site.smap.harubook.designsystem.BadgeChip
import site.smap.harubook.designsystem.BadgeTone
import site.smap.harubook.designsystem.SmapBodyEmphasisStyle
import site.smap.harubook.designsystem.SmapBodyStyle
import site.smap.harubook.designsystem.SmapBorder
import site.smap.harubook.designsystem.SmapDanger
import site.smap.harubook.designsystem.SmapHeadingStyle
import site.smap.harubook.designsystem.SmapMuted
import site.smap.harubook.designsystem.SmapPrimary
import site.smap.harubook.designsystem.SmapPrimarySoft
import site.smap.harubook.designsystem.SmapSurface
import site.smap.harubook.designsystem.SmapText

@Composable
fun QuizQuestionCard(
    quiz: Quiz,
    questionNumber: Int,
    total: Int,
    selection: Int?,
    onSelect: (Int) -> Unit,
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .background(SmapSurface, RoundedCornerShape(24.dp))
            .border(1.dp, SmapBorder, RoundedCornerShape(24.dp))
            .padding(20.dp),
        verticalArrangement = Arrangement.spacedBy(20.dp),
    ) {
        BadgeChip(text = "Q $questionNumber / $total", tone = BadgeTone.Primary)

        Text(quiz.question, style = SmapHeadingStyle, color = SmapText)

        Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
            quiz.choices.forEachIndexed { index, choice ->
                val state = when {
                    selection == null -> ChoiceState.Neutral
                    index == quiz.answerIndex -> ChoiceState.Correct
                    index == selection -> ChoiceState.Wrong
                    else -> ChoiceState.Neutral
                }
                ChoiceRow(
                    index = index,
                    text = choice,
                    state = state,
                    onClick = { if (selection == null) onSelect(index) },
                )
            }
        }

        selection?.let { sel ->
            val isCorrect = sel == quiz.answerIndex
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(
                        (if (isCorrect) SmapPrimary else SmapDanger).copy(alpha = 0.08f),
                        RoundedCornerShape(12.dp),
                    )
                    .padding(12.dp),
                verticalArrangement = Arrangement.spacedBy(6.dp),
            ) {
                Text(
                    text = if (isCorrect) "정답이에요! 🎉" else "조금 아쉬워요.",
                    style = SmapBodyEmphasisStyle,
                    color = if (isCorrect) SmapPrimary else SmapDanger,
                )
                quiz.explanation?.takeIf { it.isNotBlank() }?.let { exp ->
                    Text(exp, style = SmapBodyStyle, color = SmapMuted)
                }
            }
        }
    }
}

private enum class ChoiceState { Neutral, Correct, Wrong }

@Composable
private fun ChoiceRow(index: Int, text: String, state: ChoiceState, onClick: () -> Unit) {
    val rowBg = when (state) {
        ChoiceState.Neutral -> SmapSurface
        ChoiceState.Correct -> SmapPrimary.copy(alpha = 0.08f)
        ChoiceState.Wrong -> SmapDanger.copy(alpha = 0.08f)
    }
    val rowBorder = when (state) {
        ChoiceState.Neutral -> SmapBorder
        ChoiceState.Correct -> SmapPrimary
        ChoiceState.Wrong -> SmapDanger
    }
    val badgeBg = when (state) {
        ChoiceState.Neutral -> SmapPrimarySoft
        ChoiceState.Correct -> SmapPrimary
        ChoiceState.Wrong -> SmapDanger
    }
    val badgeFg = when (state) {
        ChoiceState.Neutral -> SmapPrimary
        ChoiceState.Correct, ChoiceState.Wrong -> Color.White
    }

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .background(rowBg, RoundedCornerShape(16.dp))
            .border(1.dp, rowBorder, RoundedCornerShape(16.dp))
            .padding(14.dp),
        verticalAlignment = Alignment.Top,
        horizontalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Box(
            modifier = Modifier
                .size(28.dp)
                .background(badgeBg, CircleShape),
            contentAlignment = Alignment.Center,
        ) {
            Text(letterFor(index), style = SmapBodyEmphasisStyle, color = badgeFg)
        }
        Text(
            text = text,
            style = SmapBodyStyle,
            color = SmapText,
            textAlign = TextAlign.Start,
            modifier = Modifier.weight(1f),
        )
        when (state) {
            ChoiceState.Correct -> Icon(Icons.Filled.CheckCircle, contentDescription = null, tint = SmapPrimary)
            ChoiceState.Wrong -> Icon(Icons.Filled.Cancel, contentDescription = null, tint = SmapDanger)
            ChoiceState.Neutral -> Unit
        }
    }
}

private fun letterFor(index: Int): String = listOf("A", "B", "C", "D").getOrNull(index) ?: (index + 1).toString()
