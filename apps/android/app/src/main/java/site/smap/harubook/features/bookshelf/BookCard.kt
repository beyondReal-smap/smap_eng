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
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.MenuBook
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import site.smap.harubook.core.models.Book
import site.smap.harubook.designsystem.AuthenticatedAsyncImage
import site.smap.harubook.designsystem.BadgeChip
import site.smap.harubook.designsystem.BadgeTone
import site.smap.harubook.designsystem.SmapBodyEmphasisStyle
import site.smap.harubook.designsystem.SmapBorder
import site.smap.harubook.designsystem.SmapCaptionStyle
import site.smap.harubook.designsystem.SmapPrimary
import site.smap.harubook.designsystem.SmapPrimarySoft
import site.smap.harubook.designsystem.SmapSurface
import site.smap.harubook.designsystem.SmapText

@Composable
fun BookCard(book: Book, onClick: () -> Unit, modifier: Modifier = Modifier) {
    Column(
        modifier = modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .background(SmapSurface, RoundedCornerShape(20.dp))
            .border(1.dp, SmapBorder, RoundedCornerShape(20.dp))
            .padding(12.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        // Cover
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(180.dp)
                .clip(RoundedCornerShape(16.dp)),
            contentAlignment = Alignment.Center,
        ) {
            val path = book.coverImagePath
            if (!path.isNullOrEmpty()) {
                AuthenticatedAsyncImage(
                    path = path,
                    modifier = Modifier.fillMaxSize(),
                    placeholder = { CoverPlaceholder(title = book.title, loading = true) },
                    failure = { CoverPlaceholder(title = book.title, loading = false) },
                )
            } else {
                CoverPlaceholder(title = book.title, loading = false)
            }
        }

        Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
            Text(book.title, style = SmapBodyEmphasisStyle, color = SmapText, maxLines = 2)
            Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                BadgeChip(text = "${book.age}세", tone = BadgeTone.Neutral)
                BadgeChip(text = book.cefr.label, tone = BadgeTone.Primary)
                book.topic?.takeIf { it.isNotBlank() }?.let {
                    BadgeChip(text = it, tone = BadgeTone.Neutral)
                }
            }
        }
    }
}

@Composable
private fun CoverPlaceholder(title: String, loading: Boolean) {
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(
                Brush.linearGradient(listOf(SmapPrimary, SmapPrimarySoft))
            ),
        contentAlignment = Alignment.Center,
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            if (loading) {
                CircularProgressIndicator(color = Color.White, strokeWidth = 2.dp)
            } else {
                Icon(
                    imageVector = Icons.Filled.MenuBook,
                    contentDescription = null,
                    tint = Color.White,
                    modifier = Modifier.padding(4.dp),
                )
            }
            Text(
                text = title,
                style = SmapCaptionStyle,
                color = Color.White,
                textAlign = TextAlign.Center,
                maxLines = 2,
                modifier = Modifier.padding(horizontal = 12.dp),
            )
        }
    }
}
