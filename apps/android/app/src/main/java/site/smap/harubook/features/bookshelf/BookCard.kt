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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import site.smap.harubook.core.models.Book
import site.smap.harubook.designsystem.AuthenticatedAsyncImage
import site.smap.harubook.designsystem.BadgeChip
import site.smap.harubook.designsystem.SmapBodyEmphasisStyle
import site.smap.harubook.designsystem.SmapBorder
import site.smap.harubook.designsystem.SmapMutedBg
import site.smap.harubook.designsystem.SmapPrimary
import site.smap.harubook.designsystem.SmapSurface
import site.smap.harubook.designsystem.SmapText
import site.smap.harubook.designsystem.tint

/**
 * iOS BookCardView 미러. 커버 이미지가 있으면 [AuthenticatedAsyncImage] 로,
 * 없으면 [BookCoverArt] (6 템플릿 × 6 팔레트 = 36 조합) 결정론 일러스트.
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
            // 긴 제목은 2줄 후 …(ellipsis)으로 표기 — iOS `.lineLimit(2)` 패리티.
            // 이전엔 maxLines 만 지정 + overflow=Clip(기본값) 이라 줄임표 없이 잘렸다.
            Text(
                text = book.title,
                style = SmapBodyEmphasisStyle,
                color = SmapText,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis,
            )
            Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                // CEFR 배지는 앱 전반에서 통계 LevelRow 와 동일한 레벨별 파스텔로 통일 —
                // 책 카드/리더/통계가 모두 같은 색 체계를 공유한다. iOS BadgeLabel(tone: .level) 패리티.
                BadgeChip(
                    text = book.cefr.label,
                    background = book.cefr.tint,
                    foreground = SmapText,
                )
                book.topic?.takeIf { it.isNotEmpty() }?.let { topic ->
                    // topic 이 길면 한 줄 + … — 카드 비대칭/세로 부풀림 방지. iOS `.lineLimit(1)` 패리티.
                    BadgeChip(
                        text = topic,
                        background = SmapMutedBg,
                        foreground = SmapText,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                }
            }
        }
    }
}

@Composable
private fun CoverPlaceholder(book: Book, isLoading: Boolean) {
    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        BookCoverArt(bookId = book.id)
        if (isLoading) {
            CircularProgressIndicator(color = Color.White, strokeWidth = 2.dp)
        }
    }
}

