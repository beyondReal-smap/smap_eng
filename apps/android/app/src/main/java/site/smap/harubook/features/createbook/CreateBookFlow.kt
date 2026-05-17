package site.smap.harubook.features.createbook

import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInHorizontally
import androidx.compose.animation.slideOutHorizontally
import androidx.compose.animation.togetherWith
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
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Close
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
import androidx.compose.ui.unit.dp
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewmodel.compose.viewModel
import site.smap.harubook.core.models.Book
import site.smap.harubook.designsystem.SmapBackground
import site.smap.harubook.designsystem.SmapBodyEmphasisStyle
import site.smap.harubook.designsystem.SmapBorder
import site.smap.harubook.designsystem.SmapPrimary
import site.smap.harubook.designsystem.SmapText

@Composable
fun CreateBookFlow(
    profileId: Int,
    ageHint: Int,
    onCreated: (Book) -> Unit,
    onCancel: () -> Unit,
) {
    val viewModel: CreateBookViewModel = viewModel(
        key = "createBook-$profileId",
        factory = remember(profileId, ageHint) {
            object : ViewModelProvider.Factory {
                override fun <T : ViewModel> create(modelClass: Class<T>): T {
                    @Suppress("UNCHECKED_CAST")
                    return CreateBookViewModel(profileId, ageHint) as T
                }
            }
        },
    )
    val state by viewModel.state.collectAsState()

    LaunchedEffect(state.createdBook) {
        state.createdBook?.let { onCreated(it) }
    }

    val totalSteps = 4
    val stepIndex = state.step.ordinal + 1
    val progress = stepIndex.toFloat() / totalSteps.toFloat()

    Column(modifier = Modifier.fillMaxSize().background(SmapBackground)) {
        TopBar(
            canGoBack = state.step !in listOf(
                CreateBookViewModel.Step.Genre, CreateBookViewModel.Step.Generating,
            ),
            onBack = viewModel::goBack,
            onClose = onCancel,
            title = "새 동화 만들기",
        )
        LinearProgressIndicator(
            progress = { progress },
            color = SmapPrimary,
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 20.dp, vertical = 8.dp),
        )

        // iOS CreateBookFlow 의 .asymmetric transition + .easeInOut(0.28) 패리티 —
        // 다음 단계로 갈 때(forward): 새 화면이 우→좌 슬라이드 인, 이전이 좌로 슬라이드 아웃.
        // 뒤로 갈 때(backward, goBack): 새 화면이 좌→우, 이전이 우로 — 방향 반전.
        // 이전엔 when 분기로 즉시 교체라 단계가 뚝 끊겨 보였다.
        Box(modifier = Modifier.weight(1f)) {
            AnimatedContent(
                targetState = state.step,
                transitionSpec = {
                    val forward = targetState.ordinal > initialState.ordinal
                    val spec = tween<Float>(durationMillis = 280)
                    val intSpec = tween<androidx.compose.ui.unit.IntOffset>(durationMillis = 280)
                    if (forward) {
                        (slideInHorizontally(animationSpec = intSpec) { it } + fadeIn(spec)) togetherWith
                            (slideOutHorizontally(animationSpec = intSpec) { -it } + fadeOut(spec))
                    } else {
                        (slideInHorizontally(animationSpec = intSpec) { -it } + fadeIn(spec)) togetherWith
                            (slideOutHorizontally(animationSpec = intSpec) { it } + fadeOut(spec))
                    }
                },
                label = "create-book-step",
            ) { step ->
                when (step) {
                    CreateBookViewModel.Step.Genre -> GenrePickerStep(onSelect = viewModel::selectGenre)
                    CreateBookViewModel.Step.Level -> LevelPickerStep(
                        genre = state.genre,
                        selected = state.cefr,
                        onSelect = viewModel::selectLevel,
                    )
                    CreateBookViewModel.Step.Intake -> IntakeStep(
                        state = state,
                        onUpdateAnswer = viewModel::updateAnswer,
                        onSelectChip = viewModel::selectChip,
                        onGenerate = viewModel::generate,
                    )
                    CreateBookViewModel.Step.Generating -> GeneratingStep(
                        isGenerating = state.isGenerating,
                        error = state.generationError,
                        onRetry = viewModel::generate,
                        onCancel = onCancel,
                    )
                }
            }
        }
    }
}

@Composable
private fun TopBar(
    canGoBack: Boolean,
    onBack: () -> Unit,
    onClose: () -> Unit,
    title: String,
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        if (canGoBack) {
            Icon(
                Icons.AutoMirrored.Filled.ArrowBack,
                contentDescription = "이전",
                tint = SmapText,
                modifier = Modifier
                    .size(28.dp)
                    .clickable(onClick = onBack),
            )
        } else {
            Box(modifier = Modifier.size(28.dp))
        }
        Text(title, style = SmapBodyEmphasisStyle, color = SmapText, modifier = Modifier.weight(1f))
        Icon(
            Icons.Filled.Close,
            contentDescription = "닫기",
            tint = SmapText,
            modifier = Modifier
                .size(28.dp)
                .clickable(onClick = onClose),
        )
    }
}
