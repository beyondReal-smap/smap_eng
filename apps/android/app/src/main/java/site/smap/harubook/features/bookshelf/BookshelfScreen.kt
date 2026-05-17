package site.smap.harubook.features.bookshelf

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AddCircle
import androidx.compose.material.icons.filled.Group
import androidx.compose.material.icons.filled.SyncAlt
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
import androidx.compose.ui.draw.clip
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewmodel.compose.viewModel
import site.smap.harubook.R
import site.smap.harubook.core.models.Profile
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
import site.smap.harubook.designsystem.SmapPrimaryForeground
import site.smap.harubook.designsystem.SmapSurface
import site.smap.harubook.designsystem.SmapText

@Composable
fun BookshelfScreen(
    profileId: Int,
    currentProfile: Profile?,
    onSwitchProfile: () -> Unit,
    onOpenBook: (Int) -> Unit,
    onCreateBook: () -> Unit,
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

    LaunchedEffect(profileId) {
        viewModel.load()
        viewModel.fetchCredits()
    }

    Column(modifier = Modifier.fillMaxSize().background(SmapBackground)) {
        Header(currentProfile = currentProfile, onSwitchProfile = onSwitchProfile)

        // iOS [BookshelfView.actionsRow] 패리티 — `새 동화 만들기` 캡슐 버튼이 좌측(주 CTA, weight 1f),
        // CreditBadge 가 우측. 이전엔 좌우가 반대였고 버튼은 RoundedCorner(16dp) + 아이콘 없음이라
        // iOS 의 Capsule + plus 아이콘 디자인과 시각 차이가 컸다.
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 20.dp),
            horizontalArrangement = Arrangement.spacedBy(10.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            CreateBookCapsuleButton(
                onClick = onCreateBook,
                modifier = Modifier.weight(1f),
            )
            CreditBadge(balance = state.credits?.balance, modifier = Modifier)
        }

        Spacer(Modifier.height(12.dp))

        LevelFilter(
            selected = state.cefrFilter,
            onChange = viewModel::setCefr,
            modifier = Modifier.padding(horizontal = 20.dp),
        )

        Spacer(Modifier.height(12.dp))

        when {
            state.isLoading && state.books.isEmpty() -> Loading()
            !state.error.isNullOrBlank() && state.books.isEmpty() -> ErrorBlock(
                message = state.error.orEmpty(),
                onRetry = viewModel::load,
            )
            state.books.isEmpty() -> EmptyState(onCreate = onCreateBook)
            else -> LazyVerticalGrid(
                columns = GridCells.Fixed(2),
                contentPadding = PaddingValues(horizontal = 20.dp, vertical = 12.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp),
                horizontalArrangement = Arrangement.spacedBy(16.dp),
                modifier = Modifier.fillMaxSize(),
            ) {
                items(state.books, key = { it.id }) { book ->
                    BookCard(book = book, onClick = { onOpenBook(book.id) })
                }
            }
        }
    }
}

/**
 * iOS [BookshelfView.headerRow] 미러.
 *
 * 타이틀은 프로필 이름과 결합("지우의 책장"). 우상단 캡슐은 아바타+이름을 노출하고
 * 탭 가능 단서로 `arrow.left.arrow.right`(여기선 [Icons.Filled.SyncAlt]) 아이콘을 동봉.
 * 이전엔 텍스트만으로 "프로필 전환"을 표시해 자녀 이름이 보이지 않았고 iOS 와 톤이 달랐다.
 */
@Composable
private fun Header(currentProfile: Profile?, onSwitchProfile: () -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 20.dp, vertical = 20.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Column {
            val title = currentProfile?.name?.takeIf { it.isNotBlank() }
                ?.let { "${it}의 ${stringResource(R.string.bookshelf_title)}" }
                ?: stringResource(R.string.bookshelf_title)
            Text(title, style = SmapDisplayStyle, color = SmapText)
            Text(stringResource(R.string.bookshelf_subtitle), style = SmapBodyStyle, color = SmapMuted)
        }
        ProfileSwitchChip(profile = currentProfile, onClick = onSwitchProfile)
    }
}

/**
 * iOS [BookshelfView.actionsRow] 의 `새 동화 만들기` 버튼 미러 — Capsule + plus 아이콘 + Bold 라벨.
 *
 * PrimaryButton 은 shape 이 16dp 라운드로 고정이라 Capsule 톤을 못 만들어 별도 인라인 컴포저블로 분리.
 */
@Composable
private fun CreateBookCapsuleButton(
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Row(
        modifier = modifier
            .height(48.dp)
            .clip(CircleShape)
            .background(SmapPrimary)
            .clickable(onClick = onClick)
            .padding(horizontal = 20.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(8.dp, Alignment.CenterHorizontally),
    ) {
        Icon(
            imageVector = Icons.Filled.AddCircle,
            contentDescription = null,
            tint = SmapPrimaryForeground,
            modifier = Modifier.height(20.dp),
        )
        Text(
            text = stringResource(R.string.bookshelf_create),
            style = SmapBodyEmphasisStyle.copy(fontSize = 16.sp),
            color = SmapPrimaryForeground,
        )
    }
}

@Composable
private fun ProfileSwitchChip(profile: Profile?, onClick: () -> Unit) {
    Row(
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(6.dp),
        modifier = Modifier
            .clip(CircleShape)
            .background(SmapSurface)
            .border(1.dp, SmapBorder, CircleShape)
            .clickable(onClick = onClick)
            .padding(horizontal = 12.dp, vertical = 10.dp),
    ) {
        val avatar = profile?.avatar
        if (!avatar.isNullOrEmpty()) {
            // 자녀 아바타(이모지) 그대로 — iOS Text(avatar) 패리티.
            Text(text = avatar, fontSize = 16.sp)
        } else {
            Icon(
                imageVector = Icons.Filled.Group,
                contentDescription = null,
                tint = SmapText,
                modifier = Modifier.height(14.dp),
            )
        }
        val label = profile?.name?.takeIf { it.isNotBlank() }
            ?: stringResource(R.string.action_switch_profile)
        Text(
            text = label,
            style = SmapCaptionStyle.copy(fontSize = 14.sp),
            color = SmapText,
            maxLines = 1,
        )
        Icon(
            imageVector = Icons.Filled.SyncAlt,
            contentDescription = null,
            tint = SmapMuted,
            modifier = Modifier.height(10.dp),
        )
    }
}

@Composable
private fun Loading() {
    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        CircularProgressIndicator(color = SmapPrimary)
    }
}

@Composable
private fun ErrorBlock(message: String, onRetry: () -> Unit) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(horizontal = 24.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp, Alignment.CenterVertically),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Text(message, style = SmapBodyStyle, color = SmapDanger, textAlign = TextAlign.Center)
        PrimaryButton(
            title = stringResource(R.string.action_retry),
            variant = PrimaryButtonVariant.Tonal,
            onClick = onRetry,
        )
    }
}

@Composable
private fun EmptyState(onCreate: () -> Unit) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(32.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp, Alignment.CenterVertically),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Text(stringResource(R.string.empty_books_title), style = SmapBodyEmphasisStyle, color = SmapText)
        Text(
            stringResource(R.string.empty_books_body),
            style = SmapBodyStyle,
            color = SmapMuted,
            textAlign = TextAlign.Center,
        )
        PrimaryButton(
            title = stringResource(R.string.bookshelf_create),
            onClick = onCreate,
        )
    }
}
