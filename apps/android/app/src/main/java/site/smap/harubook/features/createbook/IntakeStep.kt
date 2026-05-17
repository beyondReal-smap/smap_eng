package site.smap.harubook.features.createbook

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import site.smap.harubook.designsystem.PrimaryButton
import site.smap.harubook.designsystem.PrimaryButtonVariant
import site.smap.harubook.designsystem.SmapBackground
import site.smap.harubook.designsystem.SmapBodyEmphasisStyle
import site.smap.harubook.designsystem.SmapBodyStyle
import site.smap.harubook.designsystem.SmapBorder
import site.smap.harubook.designsystem.SmapCaptionStyle
import site.smap.harubook.designsystem.SmapDanger
import site.smap.harubook.designsystem.SmapMuted
import site.smap.harubook.designsystem.SmapPrimary
import site.smap.harubook.designsystem.SmapPrimaryForeground
import site.smap.harubook.designsystem.SmapPrimarySoft
import site.smap.harubook.designsystem.SmapSurface
import site.smap.harubook.designsystem.SmapText
import site.smap.harubook.designsystem.SmapTitleStyle

@OptIn(androidx.compose.foundation.layout.ExperimentalLayoutApi::class)
@Composable
fun IntakeStep(
    state: CreateBookViewModel.UiState,
    onUpdateAnswer: (String, String) -> Unit,
    onSelectChip: (String, String) -> Unit,
    onGenerate: () -> Unit,
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(SmapBackground)
            .padding(horizontal = 24.dp, vertical = 16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
            Text("아이가 좋아하는 걸 알려주세요", style = SmapTitleStyle, color = SmapText)
            Text("선택지를 눌러도 되고, 직접 적어도 좋아요. 건너뛰어도 괜찮아요.", style = SmapBodyStyle, color = SmapMuted)
        }

        Box(modifier = Modifier.weight(1f)) {
            when {
                state.isLoadingIntake && state.intakeQuestions.isEmpty() -> Box(
                    modifier = Modifier.fillMaxSize(),
                    contentAlignment = Alignment.Center,
                ) { CircularProgressIndicator(color = SmapPrimary) }

                !state.intakeError.isNullOrBlank() && state.intakeQuestions.isEmpty() -> Text(
                    state.intakeError,
                    style = SmapBodyStyle,
                    color = SmapDanger,
                )

                else -> Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .verticalScroll(rememberScrollState()),
                    verticalArrangement = Arrangement.spacedBy(20.dp),
                ) {
                    state.intakeQuestions.forEach { q ->
                        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                            Text(q.text, style = SmapBodyEmphasisStyle, color = SmapText)
                            BasicTextField(
                                value = state.intakeAnswers[q.id].orEmpty(),
                                onValueChange = { onUpdateAnswer(q.id, it) },
                                textStyle = SmapBodyStyle.copy(color = SmapText),
                                singleLine = true,
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .background(SmapSurface, RoundedCornerShape(12.dp))
                                    .border(1.dp, SmapBorder, RoundedCornerShape(12.dp))
                                    .padding(horizontal = 14.dp, vertical = 14.dp),
                                decorationBox = { inner ->
                                    if (state.intakeAnswers[q.id].isNullOrEmpty()) {
                                        Text(
                                            q.placeholder.orEmpty(),
                                            style = SmapBodyStyle,
                                            color = SmapMuted,
                                        )
                                    }
                                    inner()
                                },
                            )
                            q.suggestionChips?.takeIf { it.isNotEmpty() }?.let { chips ->
                                FlowRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                    chips.forEach { chip ->
                                        val selected = state.intakeAnswers[q.id] == chip
                                        Text(
                                            text = chip,
                                            style = SmapCaptionStyle,
                                            color = if (selected) SmapPrimaryForeground else SmapText,
                                            modifier = Modifier
                                                .clickable { onSelectChip(q.id, chip) }
                                                .background(
                                                    if (selected) SmapPrimary else SmapPrimarySoft,
                                                    RoundedCornerShape(percent = 50),
                                                )
                                                .padding(horizontal = 12.dp, vertical = 6.dp),
                                        )
                                    }
                                }
                            }
                        }
                    }
                    Spacer(Modifier.height(0.dp))
                }
            }
        }

        PrimaryButton(
            title = "동화 만들기",
            variant = PrimaryButtonVariant.Filled,
            enabled = state.intakeQuestions.isNotEmpty() && !state.isLoadingIntake,
            onClick = onGenerate,
        )
    }
}
