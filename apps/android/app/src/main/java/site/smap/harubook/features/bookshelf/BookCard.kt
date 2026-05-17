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
import androidx.compose.material3.CircularProgressIndicator
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
import site.smap.harubook.designsystem.SmapAccent
import site.smap.harubook.designsystem.SmapBodyEmphasisStyle
import site.smap.harubook.designsystem.SmapBorder
import site.smap.harubook.designsystem.SmapGold
import site.smap.harubook.designsystem.SmapDisplayStyle
import site.smap.harubook.designsystem.SmapLilac
import site.smap.harubook.designsystem.SmapMint
import site.smap.harubook.designsystem.SmapMutedBg
import site.smap.harubook.designsystem.SmapPeach
import site.smap.harubook.designsystem.SmapPrimary
import site.smap.harubook.designsystem.SmapPrimarySoft
import site.smap.harubook.designsystem.SmapRose
import site.smap.harubook.designsystem.SmapSurface
import site.smap.harubook.designsystem.SmapText
import site.smap.harubook.designsystem.tint

/**
 * iOS BookCardView 미러. 커버 이미지가 있으면 [AuthenticatedAsyncImage] 로,
 * 없으면 책별 결정론적 그라디언트 + 제목 첫 글자 폴백.
 *
 * iOS의 6종 SVG 일러스트 폴백은 Phase 5 시점에 동일 SVG 자산으로 추가 예정.
 */
@Composable
fun BookCard(
    book: Book,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(
        modifier = modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .background(SmapSurface, RoundedCornerShape(20.dp))
            .border(1.dp, SmapBorder, RoundedCornerShape(20.dp))
            .padding(12.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(180.dp)
                .clip(RoundedCornerShape(16.dp)),
        ) {
            val coverPath = book.coverImagePath
            if (!coverPath.isNullOrEmpty()) {
                AuthenticatedAsyncImage(
                    path = coverPath,
                    modifier = Modifier.fillMaxSize(),
                    placeholder = { CoverPlaceholder(book = book, isLoading = true) },
                    failure = { CoverPlaceholder(book = book, isLoading = false) },
                )
            } else {
                CoverPlaceholder(book = book, isLoading = false)
            }
        }

        Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
            Text(book.title, style = SmapBodyEmphasisStyle, color = SmapText, maxLines = 2)
            Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                BadgeChip(text = book.cefr.label, background = book.cefr.tint, foreground = SmapText)
                book.topic?.takeIf { it.isNotEmpty() }?.let { topic ->
                    BadgeChip(text = topic, background = SmapMutedBg, foreground = SmapText)
                }
            }
        }
    }
}

@Composable
private fun CoverPlaceholder(book: Book, isLoading: Boolean) {
    val palette = palettes[(book.id % palettes.size + palettes.size) % palettes.size]
    val brush = Brush.verticalGradient(listOf(palette.top, palette.bottom))
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(brush),
        contentAlignment = Alignment.Center,
    ) {
        if (isLoading) {
            CircularProgressIndicator(color = SmapPrimary, strokeWidth = 2.dp)
        } else {
            Text(
                text = book.title.firstOrNull()?.toString() ?: "📖",
                style = SmapDisplayStyle,
                color = SmapPrimarySoft,
                textAlign = TextAlign.Center,
            )
        }
    }
}

private data class Palette(val top: Color, val bottom: Color, val accent: Color)

private val palettes = listOf(
    Palette(SmapPeach, SmapGold, SmapRose),
    Palette(SmapMint, SmapAccent, SmapLilac),
    Palette(SmapAccent, SmapLilac, SmapRose),
    Palette(SmapRose, SmapPeach, SmapGold),
    Palette(SmapGold, SmapPeach, SmapMint),
    Palette(SmapLilac, SmapMint, SmapAccent),
)
