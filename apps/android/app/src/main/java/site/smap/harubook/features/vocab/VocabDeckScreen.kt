package site.smap.harubook.features.vocab

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Translate
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
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewmodel.compose.viewModel
import site.smap.harubook.R
import site.smap.harubook.core.models.VocabEntry
import site.smap.harubook.designsystem.PrimaryButton
import site.smap.harubook.designsystem.PrimaryButtonVariant
import site.smap.harubook.designsystem.SmapBackground
import site.smap.harubook.designsystem.SmapBodyEmphasisStyle
import site.smap.harubook.designsystem.SmapBodyStyle
import site.smap.harubook.designsystem.SmapBorder
import site.smap.harubook.designsystem.SmapCaptionStyle
import site.smap.harubook.designsystem.SmapDanger
import site.smap.harubook.designsystem.SmapDisplayStyle
import site.smap.harubook.designsystem.SmapMuted
import site.smap.harubook.designsystem.SmapPrimary
import site.smap.harubook.designsystem.SmapSurface
import site.smap.harubook.designsystem.SmapText

@Composable
fun VocabDeckScreen(profileId: Int) {
    val viewModel: VocabViewModel = viewModel(
        key = "vocab-$profileId",
        factory = remember(profileId) {
            object : ViewModelProvider.Factory {
                override fun <T : ViewModel> create(modelClass: Class<T>): T {
                    @Suppress("UNCHECKED_CAST")
                    return VocabViewModel(profileId) as T
                }
            }
        },
    )
    val state by viewModel.state.collectAsState()
    LaunchedEffect(profileId) { viewModel.load() }

    when {
        state.isLoading && state.entries.isEmpty() -> Centered { CircularProgressIndicator(color = SmapPrimary) }
        !state.error.isNullOrBlank() && state.entries.isEmpty() -> VocabError(state.error!!, viewModel::load)
        state.entries.isEmpty() -> VocabEmpty()
        else -> VocabList(state.entries)
    }
}

@Composable
private fun VocabList(entries: List<VocabEntry>) {
    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .background(SmapBackground)
            .padding(horizontal = 20.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        item {
            Column(modifier = Modifier.padding(top = 20.dp, bottom = 4.dp)) {
                Text(stringResource(R.string.vocab_title), style = SmapDisplayStyle, color = SmapText)
                Text("${entries.size}개의 단어", style = SmapCaptionStyle, color = SmapMuted)
            }
        }
        items(entries, key = { "${it.word}-${it.meaning}-${it.bookId}" }) { entry ->
            VocabRow(entry)
        }
        item { Spacer(Modifier.height(12.dp)) }
    }
}

@Composable
private fun VocabRow(entry: VocabEntry) {
    Column(
        verticalArrangement = Arrangement.spacedBy(6.dp),
        modifier = Modifier
            .fillMaxWidth()
            .background(SmapSurface, RoundedCornerShape(14.dp))
            .border(1.dp, SmapBorder, RoundedCornerShape(14.dp))
            .padding(16.dp),
    ) {
        Text(entry.word, style = SmapBodyEmphasisStyle, color = SmapText)
        Text(entry.meaning, style = SmapBodyStyle, color = SmapText)
        Text(entry.bookTitle, style = SmapCaptionStyle, color = SmapMuted)
    }
}

@Composable
private fun Centered(content: @Composable () -> Unit) {
    Column(
        modifier = Modifier.fillMaxSize().background(SmapBackground),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) { content() }
}

@Composable
private fun VocabError(message: String, onRetry: () -> Unit) {
    Column(
        modifier = Modifier.fillMaxSize().background(SmapBackground).padding(32.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        Text(message, style = SmapBodyStyle, color = SmapDanger, textAlign = TextAlign.Center)
        Spacer(Modifier.height(16.dp))
        PrimaryButton(title = "다시 시도", variant = PrimaryButtonVariant.Tonal, onClick = onRetry)
    }
}

@Composable
private fun VocabEmpty() {
    Column(
        modifier = Modifier.fillMaxSize().background(SmapBackground).padding(32.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        Icon(Icons.Filled.Translate, contentDescription = null, tint = SmapMuted)
        Spacer(Modifier.height(16.dp))
        Text(stringResource(R.string.vocab_empty), style = SmapBodyEmphasisStyle, color = SmapText)
        Spacer(Modifier.height(6.dp))
        Text(
            "책을 만들고 읽어 보면 단어가 여기에 쌓여요.",
            style = SmapCaptionStyle,
            color = SmapMuted,
            textAlign = TextAlign.Center,
        )
    }
}
