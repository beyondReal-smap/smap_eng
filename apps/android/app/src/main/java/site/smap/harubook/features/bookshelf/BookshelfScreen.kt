package site.smap.harubook.features.bookshelf

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.MenuBook
import androidx.compose.material.icons.filled.SwapHoriz
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
fun BookshelfScreen(
    profileId: Int,
    onSwitchProfile: () -> Unit,
    onOpenBook: (Int) -> Unit,
) {
    val viewModel: BookshelfViewModel = viewModel(
        key = "bookshelf-$profileId",
        factory = remember(profileId) {
            object : ViewModelProvider.Factory {
                override fun <T : ViewModel> create(modelClass: Class<T>): T {
                    @Suppress("UNCHECKED_CAST")
                    return BookshelfViewModel(profileId) as T
                }
            }
        },
    )
    val state by viewModel.state.collectAsState()

    LaunchedEffect(profileId) { viewModel.load() }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(SmapBackground)
            .padding(horizontal = 20.dp)
            .padding(top = 20.dp),
    ) {
        Row(verticalAlignment = Alignment.Bottom) {
            Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Text(stringResource(R.string.bookshelf_title), style = SmapDisplayStyle, color = SmapText)
                Text(stringResource(R.string.bookshelf_subtitle), style = SmapBodyStyle, color = SmapMuted)
            }
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(6.dp),
                modifier = Modifier
                    .clickable(onClick = onSwitchProfile)
                    .background(SmapSurface, RoundedCornerShape(percent = 50))
                    .border(1.dp, SmapBorder, RoundedCornerShape(percent = 50))
                    .padding(horizontal = 12.dp, vertical = 8.dp),
            ) {
                Icon(Icons.Filled.SwapHoriz, contentDescription = null, tint = SmapText, modifier = Modifier.size(16.dp))
                Text(stringResource(R.string.action_switch_profile), style = SmapCaptionStyle, color = SmapText)
            }
        }

        Spacer(Modifier.size(16.dp))

        LevelFilter(
            selectedAge = state.ageFilter,
            selectedCefr = state.cefrFilter,
            onAgeChange = viewModel::setAge,
            onCefrChange = viewModel::setCefr,
            onReset = viewModel::resetFilters,
        )

        Spacer(Modifier.size(16.dp))

        when {
            state.isLoading && state.books.isEmpty() -> Centered { CircularProgressIndicator(color = SmapPrimary) }
            state.error != null && state.books.isEmpty() -> ErrorBlock(state.error!!) { viewModel.load() }
            state.books.isEmpty() -> EmptyBlock()
            else -> LazyVerticalGrid(
                columns = GridCells.Fixed(2),
                verticalArrangement = Arrangement.spacedBy(14.dp),
                horizontalArrangement = Arrangement.spacedBy(14.dp),
                modifier = Modifier
                    .fillMaxSize()
                    .padding(bottom = 20.dp),
            ) {
                items(state.books, key = { it.id }) { book ->
                    BookCard(book = book, onClick = { onOpenBook(book.id) })
                }
            }
        }
    }
}

@Composable
private fun Centered(content: @Composable () -> Unit) {
    Box(modifier = Modifier.fillMaxSize().padding(top = 64.dp), contentAlignment = Alignment.TopCenter) {
        content()
    }
}

@Composable
private fun EmptyBlock() {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(top = 48.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Icon(
            Icons.Filled.MenuBook,
            contentDescription = null,
            tint = SmapMuted,
            modifier = Modifier.size(56.dp),
        )
        Text(stringResource(R.string.empty_books_title), style = SmapBodyEmphasisStyle, color = SmapText)
        Text(
            stringResource(R.string.empty_books_body),
            style = SmapCaptionStyle,
            color = SmapMuted,
            textAlign = TextAlign.Center,
        )
    }
}

@Composable
private fun ErrorBlock(message: String, onRetry: () -> Unit) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(top = 48.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        Text(message, style = SmapBodyStyle, color = SmapDanger, textAlign = TextAlign.Center)
        PrimaryButton(
            title = stringResource(R.string.action_retry),
            variant = PrimaryButtonVariant.Tonal,
            onClick = onRetry,
        )
    }
}
