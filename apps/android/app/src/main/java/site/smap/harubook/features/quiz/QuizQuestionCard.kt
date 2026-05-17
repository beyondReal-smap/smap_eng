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
import androidx.compose.ui.unit.dp
import site.smap.harubook.core.models.Quiz
import site.smap.harubook.designsystem.BadgeChip
import site.smap.harubook.designsystem.SmapBodyEmphasisStyle
import site.smap.harubook.designsystem.SmapBodyStyle
import site.smap.harubook.designsystem.SmapBorder
import site.smap.harubook.designsystem.SmapDanger
import site.smap.harubook.designsystem.SmapHeadingStyle
import site.smap.harubook.designsystem.SmapPrimary
import site.smap.harubook.designsystem.SmapPrimaryForeground
import site.smap.harubook.designsystem.SmapPrimarySoft
import site.smap.harubook.designsystem.SmapSurface
import site.smap.harubook.designsystem.SmapText

/**
 * 4지선다 1문제 카드 — iOS `QuizQuestionCard.swift` 패리티.
 *
 * 선택 후 즉시 정/오답 피드백 — 정답 행은 코랄, 오답은 danger 색으로 표시되고 ✓/✗ 아이콘과
 * 카드 하단 "정답이에요! 🎉 / 조금 아쉬워요." 문구 + explanation 이 노출된다.
 * 한 번 선택하면 다른 선택을 막아 학습 효과(정답을 확인하는 순간)에 집중하도록 한다.
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
            .background(SmapSurface, RoundedCornerShape(24.dp))
            .border(1.dp, SmapBorder, RoundedCornerShape(24.dp))
            .padding(20.dp),
        verticalArrangement = Arrangement.spacedBy(20.dp),
    ) {
        // 코랄 캡슐 배지 — 회색 텍스트보다 시각 위계가 분명해 진행 상황을 즉시 인지.
        BadgeChip(
            text = "Q ${index + 1} / $total",
            background = SmapPrimary,
            foreground = SmapPrimaryForeground,
        )
        Text(quiz.question, style = SmapHeadingStyle, color = SmapText)

        Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
            quiz.choices.forEachIndexed { i, choice ->
                val state = when {
                    selected == null -> ChoiceState.Neutral
                    i == quiz.answerIndex -> ChoiceState.Correct
                    i == selected -> ChoiceState.Wrong
                    else -> ChoiceState.Neutral
                }
                ChoiceRow(
                    letter = letterFor(i),
                    text = choice,
                    state = state,
                    // iOS 와 동일: 첫 선택 후엔 다른 선택을 받지 않는다.
                    onClick = { if (selected == null) onSelect(i) },
                )
            }
        }

        if (selected != null) {
            FeedbackBlock(isCorrect = selected == quiz.answerIndex, explanation = quiz.explanation)
        }
    }
}

private enum class ChoiceState { Neutral, Correct, Wrong }

private fun letterFor(index: Int): String =
    listOf("A", "B", "C", "D").getOrNull(index) ?: "${index + 1}"

@Composable
private fun ChoiceRow(
    letter: String,
    text: String,
    state: ChoiceState,
    onClick: () -> Unit,
) {
    val (rowBg, rowBorder) = when (state) {
        ChoiceState.Neutral -> SmapSurface to SmapBorder
        ChoiceState.Correct -> SmapPrimary.copy(alpha = 0.08f) to SmapPrimary
        ChoiceState.Wrong -> SmapDanger.copy(alpha = 0.08f) to SmapDanger
    }
    val (badgeBg, badgeFg) = when (state) {
        ChoiceState.Neutral -> SmapPrimarySoft to SmapPrimary
        ChoiceState.Correct -> SmapPrimary to Color.White
        ChoiceState.Wrong -> SmapDanger to Color.White
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
            Text(letter, style = SmapBodyEmphasisStyle, color = badgeFg)
        }
        Text(
            text = text,
            style = SmapBodyStyle,
            color = SmapText,
            modifier = Modifier.fillMaxWidth().weight(1f, fill = true),
        )
        when (state) {
            ChoiceState.Correct -> Icon(
                imageVector = Icons.Filled.CheckCircle,
                contentDescription = null,
                tint = SmapPrimary,
                modifier = Modifier.size(20.dp),
            )
            ChoiceState.Wrong -> Icon(
                imageVector = Icons.Filled.Cancel,
                contentDescription = null,
                tint = SmapDanger,
                modifier = Modifier.size(20.dp),
            )
            ChoiceState.Neutral -> {}
        }
    }
}

@Composable
private fun FeedbackBlock(isCorrect: Boolean, explanation: String?) {
    val accent = if (isCorrect) SmapPrimary else SmapDanger
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .background(accent.copy(alpha = 0.08f), RoundedCornerShape(12.dp))
            .padding(12.dp),
        verticalArrangement = Arrangement.spacedBy(6.dp),
    ) {
        Text(
            text = if (isCorrect) "정답이에요! 🎉" else "조금 아쉬워요.",
            style = SmapBodyEmphasisStyle,
            color = accent,
        )
        if (!explanation.isNullOrEmpty()) {
            Text(text = explanation, style = SmapBodyStyle, color = SmapText)
        }
    }
}
