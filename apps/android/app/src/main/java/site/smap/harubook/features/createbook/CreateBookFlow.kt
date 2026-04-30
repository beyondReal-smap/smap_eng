package site.smap.harubook.features.createbook

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewmodel.compose.viewModel
import site.smap.harubook.core.models.Book
import site.smap.harubook.designsystem.SmapBackground
import site.smap.harubook.designsystem.SmapPrimary

@Composable
fun CreateBookFlow(
    profileId: Int,
    onCreated: (Book) -> Unit,
    onCancel: () -> Unit,
) {
    val viewModel: CreateBookViewModel = viewModel(
        key = "create-book-$profileId",
        factory = remember(profileId) {
            object : ViewModelProvider.Factory {
                override fun <T : ViewModel> create(modelClass: Class<T>): T {
                    @Suppress("UNCHECKED_CAST")
                    return CreateBookViewModel(profileId = profileId) as T
                }
            }
        },
    )
    val state by viewModel.state.collectAsState()

    LaunchedEffect(state.createdBook) {
        state.createdBook?.let(onCreated)
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(SmapBackground),
    ) {
        val progress = (state.step.ordinal + 1) / 4f
        LinearProgressIndicator(
            progress = { progress },
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 20.dp, vertical = 8.dp),
            color = SmapPrimary,
        )

        Box(modifier = Modifier.fillMaxSize()) {
            when (state.step) {
                CreateStep.Genre -> GenrePickerStep(onSelect = viewModel::selectGenre)
                CreateStep.Level -> LevelPickerStep(
                    selected = state.cefr,
                    onSelect = viewModel::selectLevel,
                    onBack = viewModel::goBack,
                )
                CreateStep.Intake -> IntakeStep(
                    state = state,
                    onUpdateAnswer = viewModel::updateAnswer,
                    onChip = viewModel::selectChip,
                    onRetryLoad = viewModel::loadIntake,
                    onSubmit = viewModel::generate,
                    onBack = viewModel::goBack,
                )
                CreateStep.Generating -> GeneratingStep(
                    state = state,
                    onRetry = viewModel::retryGenerate,
                    onCancel = onCancel,
                )
            }
        }
    }
}
