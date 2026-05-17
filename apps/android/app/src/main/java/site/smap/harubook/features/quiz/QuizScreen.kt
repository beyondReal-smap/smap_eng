package site.smap.harubook.features.quiz

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewmodel.compose.viewModel
import site.smap.harubook.designsystem.PrimaryButton
import site.smap.harubook.designsystem.PrimaryButtonVariant
import site.smap.harubook.designsystem.SmapBackground
import site.smap.harubook.designsystem.SmapBodyStyle
import site.smap.harubook.designsystem.SmapCaptionStyle
import site.smap.harubook.designsystem.SmapDanger
import site.smap.harubook.designsystem.SmapMuted
import site.smap.harubook.designsystem.SmapPrimary
import site.smap.harubook.designsystem.SmapText

@Composable
fun QuizScreen(
    bookId: Int,
    readingLogId: Int?,
    onClose: () -> Unit,
) {
    val viewModel: QuizViewModel = viewModel(
        key = "quiz-$bookId",
        factory = remember(bookId, readingLogId) {
            object : ViewModelProvider.Factory {
                override fun <T : ViewModel> create(modelClass: Class<T>): T {
                    @Suppress("UNCHECKED_CAST")
                    return QuizViewModel(bookId, readingLogId) as T
                }
            }
        },
    )
    val state by viewModel.state.collectAsState()

    LaunchedEffect(bookId) { viewModel.load() }

    when (val phase = state.phase) {
        is QuizViewModel.Phase.Loading -> Loading()
        is QuizViewModel.Phase.Error -> ErrorBlock(message = phase.message, onRetry = viewModel::load, onClose = onClose)
        is QuizViewModel.Phase.Finished -> QuizResultScreen(
            score = state.score,
            total = state.totalQuestions,
            onRestart = viewModel::restart,
            onClose = onClose,
        )
        is QuizViewModel.Phase.Answering -> Answering(
            state = state,
            onSelect = viewModel::selectAnswer,
            onNext = viewModel::goToNext,
            onPrev = viewModel::goToPrevious,
            onSubmit = viewModel::submit,
            onClose = onClose,
        )
    }
}

@Composable
private fun Answering(
    state: QuizViewModel.UiState,
    onSelect: (Int) -> Unit,
    onNext: () -> Unit,
    onPrev: () -> Unit,
    onSubmit: () -> Unit,
    onClose: () -> Unit,
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(SmapBackground)
            .padding(horizontal = 20.dp, vertical = 16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text("퀴즈", style = SmapBodyStyle, color = SmapMuted)
            Icon(
                Icons.Filled.Close,
                contentDescription = "닫기",
                tint = SmapMuted,
                modifier = Modifier
                    .size(28.dp)
                    .clickable(onClick = onClose),
            )
        }

        state.currentQuiz?.let { quiz ->
            QuizQuestionCard(
                quiz = quiz,
                index = state.currentIndex,
                total = state.totalQuestions,
                selected = state.selections[quiz.id],
                onSelect = onSelect,
                modifier = Modifier.weight(1f),
            )
        }

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            if (state.currentIndex > 0) {
                PrimaryButton(
                    title = "이전",
                    variant = PrimaryButtonVariant.Tonal,
                    onClick = onPrev,
                    modifier = Modifier.weight(1f),
                )
            }
            if (state.isLastQuestion) {
                PrimaryButton(
                    title = "결과 보기",
                    enabled = state.currentQuiz?.let { state.selections[it.id] != null } == true,
                    isLoading = state.isSubmitting,
                    onClick = onSubmit,
                    modifier = Modifier.weight(1f),
                )
            } else {
                PrimaryButton(
                    title = "다음",
                    enabled = state.currentQuiz?.let { state.selections[it.id] != null } == true,
                    onClick = onNext,
                    modifier = Modifier.weight(1f),
                )
            }
        }
    }
}

@Composable
private fun Loading() {
    Box(modifier = Modifier.fillMaxSize().background(SmapBackground), contentAlignment = Alignment.Center) {
        CircularProgressIndicator(color = SmapPrimary)
    }
}

@Composable
private fun ErrorBlock(message: String, onRetry: () -> Unit, onClose: () -> Unit) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(SmapBackground)
            .padding(horizontal = 24.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp, Alignment.CenterVertically),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Text(message, style = SmapBodyStyle, color = SmapDanger, textAlign = TextAlign.Center)
        PrimaryButton(title = "다시 시도", variant = PrimaryButtonVariant.Tonal, onClick = onRetry)
        Text(
            "닫기",
            style = SmapCaptionStyle,
            color = SmapText,
            modifier = Modifier.clickable(onClick = onClose),
        )
    }
}
