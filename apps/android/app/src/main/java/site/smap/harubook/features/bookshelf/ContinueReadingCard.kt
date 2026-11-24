package site.smap.harubook.features.bookshelf

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material.icons.filled.MenuBook
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import site.smap.harubook.R
import site.smap.harubook.core.models.Book
import site.smap.harubook.designsystem.AuthenticatedAsyncImage
import site.smap.harubook.designsystem.SmapBodyEmphasisStyle
import site.smap.harubook.designsystem.SmapBorder
import site.smap.harubook.designsystem.SmapCaptionStyle
import site.smap.harubook.designsystem.SmapMuted
import site.smap.harubook.designsystem.SmapMutedBg
import site.smap.harubook.designsystem.SmapPrimaryForeground
import site.smap.harubook.designsystem.SmapPrimarySoft
import site.smap.harubook.designsystem.SmapSurface
import site.smap.harubook.designsystem.SmapText

/**
 * 책장 상단 "이어 읽기" CTA. iOS `ContinueReadingCard` / 웹 `ContinueCard` 패리티.
 * `continueBookId`가 목록에 있을 때만 부모가 렌더한다.
 */
@Composable
fun ContinueReadingCard(
    book: Book,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val continueLabel = stringResource(R.string.bookshelf_continue)
    Row(
        modifier = modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(20.dp))
            .background(SmapSurface)
            .border(1.dp, SmapBorder, RoundedCornerShape(20.dp))
            .clickable(onClick = onClick)
            .padding(12.dp)
            .semantics { contentDescription = "$continueLabel, ${book.title}" },
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Box(
            modifier = Modifier
                .width(112.dp)
                .height(80.dp)
                .clip(RoundedCornerShape(12.dp)),
        ) {
            val coverPath = book.coverImagePath
            if (!coverPath.isNullOrEmpty()) {
                AuthenticatedAsyncImage(
                    path = coverPath,
                    modifier = Modifier.fillMaxSize(),
                    placeholder = { Box(Modifier.fillMaxSize().background(SmapMutedBg)) },
                    failure = { Box(Modifier.fillMaxSize().background(SmapMutedBg)) },
                )
            } else {
                Box(
                    modifier = Modifier.fillMaxSize().background(SmapMutedBg),
                    contentAlignment = Alignment.Center,
                ) {
                    Icon(
                        imageVector = Icons.Filled.MenuBook,
                        contentDescription = null,
                        tint = SmapMuted,
                        modifier = Modifier.size(22.dp),
                    )
                }
            }
        }

        Column(
            modifier = Modifier.weight(1f),
            verticalArrangement = Arrangement.spacedBy(4.dp, Alignment.CenterVertically),
        ) {
            Text(
                text = continueLabel,
                style = SmapCaptionStyle.copy(fontSize = 11.sp),
                color = SmapPrimaryForeground,
                modifier = Modifier
                    .background(SmapPrimarySoft, CircleShape)
                    .padding(horizontal = 8.dp, vertical = 3.dp),
            )
            Text(
                text = book.title,
                style = SmapBodyEmphasisStyle,
                color = SmapText,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis,
            )
            Text(
                text = stringResource(R.string.bookshelf_continue_hint),
                style = SmapCaptionStyle,
                color = SmapMuted,
            )
        }

        Icon(
            imageVector = Icons.Filled.ChevronRight,
            contentDescription = null,
            tint = SmapMuted,
            modifier = Modifier.size(18.dp),
        )
    }
}
