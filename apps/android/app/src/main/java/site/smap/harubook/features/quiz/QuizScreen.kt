package site.smap.harubook.features.quiz

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewmodel.compose.viewModel
import site.smap.harubook.designsystem.PrimaryButton
import site.smap.harubook.designsystem.PrimaryButtonVariant
import site.smap.harubook.designsystem.SmapBackground
import site.smap.harubook.designsystem.SmapBodyEmphasisStyle
import site.smap.harubook.designsystem.SmapBodyStyle
import site.smap.harubook.designsystem.SmapBorder
import site.smap.harubook.designsystem.SmapDanger
import site.smap.harubook.designsystem.SmapMuted
import site.smap.harubook.designsystem.SmapPrimary
import site.smap.harubook.designsystem.SmapText

/**
 * 퀴즈 화면 — iOS `QuizView.swift` 패리티.
 *
 * 4지선다 한 번에 1문제씩 풀고, 마지막에 결과 화면. 선택 즉시 정/오답 카드 내부 피드백이 뜨며
 * "다음 문제"/"결과 보기" 단일 버튼으로 진행한다. 이전 단계로 돌아가는 버튼은 없다(iOS 와 동일).
 */
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

    Column(modifier = Modifier.fillMaxSize().background(SmapBackground)) {
        QuizTopBar(onClose = onClose)
        when (val phase = state.phase) {
            is QuizViewModel.Phase.Loading -> LoadingState()
            is QuizViewModel.Phase.Error -> ErrorBlock(
                message = phase.message,
                onRetry = viewModel::load,
                onClose = onClose,
            )
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
                onSubmit = viewModel::submit,
            )
        }
    }
}

/** iOS NavigationStack 의 navigationTitle("퀴즈") 패리티 — 좌측 닫기 + 정중앙 "퀴즈". */
@Composable
private fun QuizTopBar(onClose: () -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(
            imageVector = Icons.Filled.Close,
            contentDescription = "닫기",
            tint = SmapText,
            modifier = Modifier.size(28.dp).clickable(onClick = onClose),
        )
        Box(modifier = Modifier.weight(1f), contentAlignment = Alignment.Center) {
            Text("퀴즈", style = SmapBodyEmphasisStyle, color = SmapText)
        }
        // 우측 균형 — 정중앙 정렬 유지.
        Box(modifier = Modifier.size(28.dp))
    }
}

@Composable
private fun Answering(
    state: QuizViewModel.UiState,
    onSelect: (Int) -> Unit,
    onNext: () -> Unit,
    onSubmit: () -> Unit,
) {
    Column(modifier = Modifier.fillMaxSize()) {
        // 진행률 바 — iOS QuizView.answering 패리티. 카드 위에 별도로 위치해 시각 위계 분리.
        if (state.totalQuestions > 0) {
            LinearProgressIndicator(
                progress = { (state.currentIndex + 1).toFloat() / state.totalQuestions.toFloat() },
                color = SmapPrimary,
                trackColor = SmapBorder.copy(alpha = 0.4f),
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 24.dp, vertical = 12.dp)
                    .height(4.dp)
                    .clip(androidx.compose.foundation.shape.CircleShape),
            )
        }

        // 본문 — Scrollable. 긴 설명/explanation 이 들어와도 모두 보이게.
        Column(
            modifier = Modifier
                .weight(1f)
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 20.dp, vertical = 8.dp),
        ) {
            state.currentQuiz?.let { quiz ->
                QuizQuestionCard(
                    quiz = quiz,
                    index = state.currentIndex,
                    total = state.totalQuestions,
                    selected = state.selections[quiz.id],
                    onSelect = onSelect,
                )
            }
        }

        // 푸터 — 단일 버튼만(iOS 와 동일하게 "이전" 미포함).
        val currentQuiz = state.currentQuiz
        val answered = currentQuiz != null && state.selections[currentQuiz.id] != null
        HorizontalDivider(color = SmapBorder)
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .background(SmapBackground)
                .padding(horizontal = 20.dp, vertical = 16.dp),
        ) {
            if (state.isLastQuestion) {
                PrimaryButton(
                    title = if (state.isSubmitting) "제출 중…" else "결과 보기",
                    enabled = answered && !state.isSubmitting,
                    isLoading = state.isSubmitting,
                    onClick = onSubmit,
                    modifier = Modifier.fillMaxWidth(),
                )
            } else {
                PrimaryButton(
                    title = "다음 문제",
                    enabled = answered,
                    onClick = onNext,
                    modifier = Modifier.fillMaxWidth(),
                )
            }
        }
    }
}

/** iOS "퀴즈를 준비하고 있어요…" — 스피너 + 보조 메시지. */
@Composable
private fun LoadingState() {
    Column(
        modifier = Modifier.fillMaxSize(),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        CircularProgressIndicator(color = SmapPrimary)
        Spacer(Modifier.height(16.dp))
        Text("퀴즈를 준비하고 있어요…", style = SmapBodyStyle, color = SmapMuted)
    }
}

@Composable
private fun ErrorBlock(message: String, onRetry: () -> Unit, onClose: () -> Unit) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(horizontal = 24.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp, Alignment.CenterVertically),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Text(message, style = SmapBodyStyle, color = SmapDanger, textAlign = TextAlign.Center)
        PrimaryButton(title = "다시 시도", variant = PrimaryButtonVariant.Tonal, onClick = onRetry)
    }
}
