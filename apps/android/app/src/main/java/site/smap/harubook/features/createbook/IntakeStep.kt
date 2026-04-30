package site.smap.harubook.features.createbook

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ChevronLeft
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import site.smap.harubook.core.models.IntakeQuestion
import site.smap.harubook.designsystem.PrimaryButton
import site.smap.harubook.designsystem.PrimaryButtonVariant
import site.smap.harubook.designsystem.SmapBadgeStyle
import site.smap.harubook.designsystem.SmapBodyEmphasisStyle
import site.smap.harubook.designsystem.SmapBodyStyle
import site.smap.harubook.designsystem.SmapBorder
import site.smap.harubook.designsystem.SmapCaptionStyle
import site.smap.harubook.designsystem.SmapDanger
import site.smap.harubook.designsystem.SmapMuted
import site.smap.harubook.designsystem.SmapPrimary
import site.smap.harubook.designsystem.SmapPrimarySoft
import site.smap.harubook.designsystem.SmapSurface
import site.smap.harubook.designsystem.SmapText
import site.smap.harubook.designsystem.SmapTitleStyle

@Composable
fun IntakeStep(
    state: CreateBookUiState,
    onUpdateAnswer: (id: String, text: String) -> Unit,
    onChip: (id: String, value: String) -> Unit,
    onRetryLoad: () -> Unit,
    onSubmit: () -> Unit,
    onBack: () -> Unit,
) {
    Column(modifier = Modifier.fillMaxSize()) {
        Column(
            modifier = Modifier
                .weight(1f)
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 20.dp, vertical = 16.dp),
            verticalArrangement = Arrangement.spacedBy(20.dp),
        ) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Icon(
                    Icons.Filled.ChevronLeft,
                    contentDescription = "이전",
                    tint = SmapText,
                    modifier = Modifier
                        .size(28.dp)
                        .clickable(onClick = onBack),
                )
                Text("아이가 좋아하는 걸 알려주세요", style = SmapTitleStyle, color = SmapText)
            }
            Text(
                "선택지를 눌러도 되고, 직접 적어도 좋아요. 건너뛰어도 괜찮아요.",
                style = SmapCaptionStyle,
                color = SmapMuted,
            )

            when {
                state.isLoadingIntake && state.intakeQuestions.isEmpty() -> {
                    Box(modifier = Modifier.fillMaxWidth().padding(top = 32.dp), contentAlignment = Alignment.Center) {
                        CircularProgressIndicator(color = SmapPrimary)
                    }
                }
                state.intakeError != null && state.intakeQuestions.isEmpty() -> {
                    Column(
                        modifier = Modifier.fillMaxWidth().padding(top = 16.dp),
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.spacedBy(12.dp),
                    ) {
                        Text(state.intakeError, style = SmapBodyStyle, color = SmapDanger, textAlign = TextAlign.Center)
                        PrimaryButton(title = "다시 시도", variant = PrimaryButtonVariant.Tonal, onClick = onRetryLoad)
                    }
                }
                else -> {
                    state.intakeQuestions.forEach { question ->
                        QuestionCard(
                            question = question,
                            value = state.intakeAnswers[question.id].orEmpty(),
                            onChange = { onUpdateAnswer(question.id, it) },
                            onChip = { onChip(question.id, it) },
                        )
                    }
                }
            }
        }

        Footer(canSubmit = state.intakeQuestions.isNotEmpty(), onSkip = onSubmit, onSubmit = onSubmit)
    }
}

@Composable
private fun QuestionCard(
    question: IntakeQuestion,
    value: String,
    onChange: (String) -> Unit,
    onChip: (String) -> Unit,
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .background(SmapSurface, RoundedCornerShape(20.dp))
            .border(1.dp, SmapBorder, RoundedCornerShape(20.dp))
            .padding(18.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Text(question.text, style = SmapBodyEmphasisStyle, color = SmapText)
        BasicTextField(
            value = value,
            onValueChange = onChange,
            textStyle = SmapBodyStyle.copy(color = SmapText),
            modifier = Modifier
                .fillMaxWidth()
                .background(SmapPrimarySoft, RoundedCornerShape(14.dp))
                .padding(14.dp),
        )
        question.suggestionChips?.takeIf { it.isNotEmpty() }?.let { chips ->
            Row(
                modifier = Modifier.horizontalScroll(rememberScrollState()),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                chips.forEach { chip ->
                    val selected = value == chip
                    Text(
                        text = chip,
                        style = SmapBadgeStyle,
                        color = if (selected) Color.White else SmapText,
                        modifier = Modifier
                            .clickable(onClick = { onChip(chip) })
                            .background(
                                if (selected) SmapPrimary else SmapSurface,
                                RoundedCornerShape(percent = 50),
                            )
                            .border(
                                1.dp,
                                if (selected) Color.Transparent else SmapBorder,
                                RoundedCornerShape(percent = 50),
                            )
                            .padding(horizontal = 12.dp, vertical = 8.dp),
                    )
                }
            }
        }
    }
}

@Composable
private fun Footer(canSubmit: Boolean, onSkip: () -> Unit, onSubmit: () -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 20.dp, vertical = 16.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(
            "건너뛰기",
            style = SmapBodyEmphasisStyle,
            color = SmapMuted,
            modifier = Modifier.clickable(onClick = onSkip),
        )
        Spacer(Modifier.weight(1f))
        Box(modifier = Modifier.weight(1.5f)) {
            PrimaryButton(
                title = "만들기 (별 1개)",
                enabled = canSubmit,
                onClick = onSubmit,
            )
        }
    }
}
