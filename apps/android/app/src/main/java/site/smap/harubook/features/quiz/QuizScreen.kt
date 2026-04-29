package site.smap.harubook.features.quiz

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.LinearProgressIndicator
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
import site.smap.harubook.designsystem.SmapDanger
import site.smap.harubook.designsystem.SmapMuted
import site.smap.harubook.designsystem.SmapPrimary

@Composable
fun QuizScreen(
    bookId: Int,
    bookTitle: String,
    readingLogId: Int?,
    onClose: () -> Unit,
) {
    val viewModel: QuizViewModel = viewModel(
        key = "quiz-$bookId",
        factory = remember(bookId, bookTitle, readingLogId) {
            object : ViewModelProvider.Factory {
                override fun <T : ViewModel> create(modelClass: Class<T>): T {
                    @Suppress("UNCHECKED_CAST")
                    return QuizViewModel(
                        bookId = bookId,
                        bookTitle = bookTitle,
                        readingLogId = readingLogId,
                    ) as T
                }
            }
        },
    )
    val state by viewModel.state.collectAsState()

    LaunchedEffect(bookId) {
        if (state.quizzes.isEmpty()) viewModel.load()
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(SmapBackground),
    ) {
        when (val phase = state.phase) {
            is QuizPhase.Loading -> Loading()
            is QuizPhase.Error -> ErrorBlock(message = phase.message, onRetry = { viewModel.load() })
            is QuizPhase.Answering -> Answering(viewModel = viewModel)
            is QuizPhase.Finished -> QuizResultScreen(
                bookTitle = bookTitle,
                score = viewModel.score,
                total = viewModel.totalQuestions,
                onRetry = { viewModel.restart() },
                onClose = onClose,
            )
        }
    }
}

@Composable
private fun Loading() {
    Column(
        modifier = Modifier.fillMaxSize(),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        CircularProgressIndicator(color = SmapPrimary)
        Spacer(Modifier.padding(top = 16.dp))
        Text("퀴즈를 준비하고 있어요…", style = SmapBodyStyle, color = SmapMuted)
    }
}

@Composable
private fun ErrorBlock(message: String, onRetry: () -> Unit) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(horizontal = 24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(16.dp, Alignment.CenterVertically),
    ) {
        Text(message, style = SmapBodyStyle, color = SmapDanger, textAlign = TextAlign.Center)
        PrimaryButton(title = "다시 시도", variant = PrimaryButtonVariant.Tonal, onClick = onRetry)
    }
}

@Composable
private fun Answering(viewModel: QuizViewModel) {
    val state by viewModel.state.collectAsState()
    val total = viewModel.totalQuestions
    val current = viewModel.currentQuiz
    val answered = current?.let { state.selections[it.id] } != null

    Column(modifier = Modifier.fillMaxSize()) {
        LinearProgressIndicator(
            progress = { (state.currentIndex + 1).toFloat() / total.coerceAtLeast(1).toFloat() },
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 24.dp, vertical = 12.dp),
            color = SmapPrimary,
        )

        Column(
            modifier = Modifier
                .weight(1f)
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 20.dp, vertical = 8.dp),
        ) {
            current?.let { quiz ->
                QuizQuestionCard(
                    quiz = quiz,
                    questionNumber = state.currentIndex + 1,
                    total = total,
                    selection = state.selections[quiz.id],
                    onSelect = { viewModel.selectAnswer(it) },
                )
            }
        }

        Box(
            modifier = Modifier
                .fillMaxWidth()
                .padding(20.dp),
        ) {
            if (viewModel.isLastQuestion) {
                PrimaryButton(
                    title = if (state.isSubmitting) "제출 중…" else "결과 보기",
                    isLoading = state.isSubmitting,
                    enabled = answered && !state.isSubmitting,
                    onClick = { viewModel.submit() },
                )
            } else {
                PrimaryButton(
                    title = "다음 문제",
                    enabled = answered,
                    onClick = { viewModel.goToNext() },
                )
            }
        }
    }
}
