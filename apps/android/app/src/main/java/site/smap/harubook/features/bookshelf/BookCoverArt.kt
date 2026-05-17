package site.smap.harubook.features.bookshelf

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.drawscope.DrawScope
import site.smap.harubook.designsystem.SmapAccent
import site.smap.harubook.designsystem.SmapGold
import site.smap.harubook.designsystem.SmapLilac
import site.smap.harubook.designsystem.SmapMint
import site.smap.harubook.designsystem.SmapPeach
import site.smap.harubook.designsystem.SmapRose
import kotlin.math.PI
import kotlin.math.abs
import kotlin.math.sin

/**
 * iOS `BookCardView.swift` 의 CoverPlaceholder 6 템플릿 × 6 팔레트 = 36 조합 미러.
 * `book.id` 시드로 결정론적 선택, Compose Canvas Path 로 직접 그린다.
 */

internal data class CoverPalette(val top: Color, val bottom: Color, val accent: Color)

internal enum class CoverTemplate { Mountain, Forest, Ocean, NightSky, Castle, Balloon }

internal val coverPalettes: List<CoverPalette> = listOf(
    CoverPalette(SmapPeach, SmapGold, SmapRose),     // 일출
    CoverPalette(SmapMint, SmapAccent, SmapLilac),   // 새벽
    CoverPalette(SmapAccent, SmapLilac, SmapRose),   // 노을
    CoverPalette(SmapRose, SmapPeach, SmapGold),     // 분홍 황혼
    CoverPalette(SmapGold, SmapPeach, SmapMint),     // 황금 들녘
    CoverPalette(SmapLilac, SmapMint, SmapAccent),   // 안개
)

internal fun pickTemplate(bookId: Int): CoverTemplate =
    CoverTemplate.entries[abs(bookId) % CoverTemplate.entries.size]

internal fun pickPalette(bookId: Int): CoverPalette =
    coverPalettes[abs(bookId / 7) % coverPalettes.size]

@Composable
fun BookCoverArt(bookId: Int, modifier: Modifier = Modifier) {
    val template = pickTemplate(bookId)
    val palette = pickPalette(bookId)

    Canvas(modifier = modifier.fillMaxSize()) {
        drawRect(
            brush = Brush.verticalGradient(
                colors = listOf(palette.top, palette.bottom),
                startY = 0f,
                endY = size.height,
            ),
        )
        when (template) {
            CoverTemplate.Mountain -> drawMountain(palette)
            CoverTemplate.Forest -> drawForest(palette)
            CoverTemplate.Ocean -> drawOcean(palette)
            CoverTemplate.NightSky -> drawNightSky(palette)
            CoverTemplate.Castle -> drawCastle(palette)
            CoverTemplate.Balloon -> drawBalloon(palette)
        }
    }
}

// MARK: - 6 일러스트

private fun DrawScope.drawMountain(palette: CoverPalette) {
    val w = size.width
    val h = size.height

    // 태양
    drawCircle(
        color = palette.accent.copy(alpha = 0.85f),
        radius = w * 0.16f,
        center = Offset(w * 0.72f, h * 0.28f),
    )

    // 뒷산 (밝은 삼각형)
    drawTriangleCentered(
        color = Color.White.copy(alpha = 0.35f),
        center = Offset(w * 0.35f, h * 0.6f),
        sizePx = Size(w * 0.7f, h * 0.45f),
    )

    // 앞산 (어두운 삼각형)
    drawTriangleCentered(
        color = Color.Black.copy(alpha = 0.25f),
        center = Offset(w * 0.65f, h * 0.68f),
        sizePx = Size(w * 0.85f, h * 0.38f),
    )
}

private fun DrawScope.drawForest(palette: CoverPalette) {
    val w = size.width
    val h = size.height

    drawCircle(
        color = palette.accent.copy(alpha = 0.7f),
        radius = w * 0.11f,
        center = Offset(w * 0.78f, h * 0.22f),
    )

    val trees = listOf(
        Triple(0.15f, 0.65f, 0.45f),
        Triple(0.35f, 0.6f, 0.55f),
        Triple(0.55f, 0.66f, 0.42f),
        Triple(0.78f, 0.62f, 0.5f),
    )
    for ((x, y, hh) in trees) {
        drawTreeCentered(
            color = Color.Black.copy(alpha = 0.3f),
            center = Offset(w * x, h * y),
            sizePx = Size(w * 0.18f, h * hh),
        )
    }
}

private fun DrawScope.drawOcean(palette: CoverPalette) {
    val w = size.width
    val h = size.height

    // 태양
    drawCircle(
        color = palette.accent.copy(alpha = 0.75f),
        radius = w * 0.13f,
        center = Offset(w * 0.25f, h * 0.25f),
    )

    // 배 — 사다리꼴 선체 + 돛
    val shipCenter = Offset(w * 0.6f, h * 0.5f)
    drawTrapezoidCentered(
        color = Color.White.copy(alpha = 0.85f),
        center = Offset(shipCenter.x, shipCenter.y + h * 0.18f),
        sizePx = Size(w * 0.28f, h * 0.08f),
    )
    drawTriangleCentered(
        color = palette.accent.copy(alpha = 0.9f),
        center = Offset(shipCenter.x, shipCenter.y + h * 0.03f),
        sizePx = Size(w * 0.18f, h * 0.22f),
    )

    // 파도 2겹
    drawWaveCentered(
        color = Color.White.copy(alpha = 0.4f),
        center = Offset(w / 2f, h * 0.78f),
        sizePx = Size(w, h * 0.25f),
        phase = 0.0,
    )
    drawWaveCentered(
        color = Color.Black.copy(alpha = 0.18f),
        center = Offset(w / 2f, h * 0.88f),
        sizePx = Size(w, h * 0.22f),
        phase = PI,
    )
}

private fun DrawScope.drawNightSky(palette: CoverPalette) {
    val w = size.width
    val h = size.height

    // 달
    drawCircle(
        color = Color.White.copy(alpha = 0.95f),
        radius = w * 0.14f,
        center = Offset(w * 0.7f, h * 0.28f),
    )
    // 그림자 (초승달)
    drawCircle(
        color = palette.top,
        radius = w * 0.12f,
        center = Offset(w * 0.78f, h * 0.25f),
    )

    // 별 6개
    val stars = listOf(
        Triple(0.18f, 0.18f, 0.07f),
        Triple(0.32f, 0.4f, 0.05f),
        Triple(0.5f, 0.22f, 0.06f),
        Triple(0.15f, 0.55f, 0.06f),
        Triple(0.42f, 0.7f, 0.05f),
        Triple(0.85f, 0.55f, 0.06f),
    )
    for ((x, y, sz) in stars) {
        drawStar(
            color = Color.White.copy(alpha = 0.9f),
            center = Offset(w * x, h * y),
            radius = w * sz,
        )
    }
}

private fun DrawScope.drawCastle(palette: CoverPalette) {
    val w = size.width
    val h = size.height

    // 본채
    drawRectCentered(
        color = Color.White.copy(alpha = 0.6f),
        center = Offset(w * 0.5f, h * 0.55f),
        sizePx = Size(w * 0.4f, h * 0.32f),
    )

    // 좌측 탑
    drawRectCentered(
        color = Color.White.copy(alpha = 0.7f),
        center = Offset(w * 0.28f, h * 0.55f),
        sizePx = Size(w * 0.14f, h * 0.45f),
    )
    drawTriangleCentered(
        color = palette.accent,
        center = Offset(w * 0.28f, h * 0.55f - h * 0.22f),
        sizePx = Size(w * 0.16f, h * 0.14f),
    )

    // 우측 탑
    drawRectCentered(
        color = Color.White.copy(alpha = 0.7f),
        center = Offset(w * 0.72f, h * 0.52f),
        sizePx = Size(w * 0.14f, h * 0.5f),
    )
    drawTriangleCentered(
        color = palette.accent,
        center = Offset(w * 0.72f, h * 0.52f - h * 0.25f),
        sizePx = Size(w * 0.16f, h * 0.14f),
    )

    // 정문
    drawRectCentered(
        color = Color.Black.copy(alpha = 0.45f),
        center = Offset(w * 0.5f, h * 0.63f),
        sizePx = Size(w * 0.1f, h * 0.16f),
    )
}

private fun DrawScope.drawBalloon(palette: CoverPalette) {
    val w = size.width
    val h = size.height

    // 구름 2개
    drawCloudCentered(
        color = Color.White.copy(alpha = 0.7f),
        center = Offset(w * 0.2f, h * 0.7f),
        sizePx = Size(w * 0.35f, h * 0.13f),
    )
    drawCloudCentered(
        color = Color.White.copy(alpha = 0.55f),
        center = Offset(w * 0.75f, h * 0.78f),
        sizePx = Size(w * 0.3f, h * 0.11f),
    )

    // 열기구 — 풍선 + 줄 2 + 바구니
    val anchor = Offset(w * 0.55f, h * 0.4f)
    drawCircle(
        color = palette.accent.copy(alpha = 0.95f),
        radius = w * 0.15f,
        center = Offset(anchor.x, anchor.y - h * 0.05f),
    )
    // 줄
    drawRectCentered(
        color = Color.Black.copy(alpha = 0.35f),
        center = Offset(anchor.x - w * 0.04f, anchor.y + h * 0.1f),
        sizePx = Size(w * 0.008f, h * 0.08f),
    )
    drawRectCentered(
        color = Color.Black.copy(alpha = 0.35f),
        center = Offset(anchor.x + w * 0.04f, anchor.y + h * 0.1f),
        sizePx = Size(w * 0.008f, h * 0.08f),
    )
    // 바구니
    drawRectCentered(
        color = Color.Black.copy(alpha = 0.55f),
        center = Offset(anchor.x, anchor.y + h * 0.16f),
        sizePx = Size(w * 0.12f, h * 0.05f),
    )
}

// MARK: - Shape primitives (center+size 기반)

private fun DrawScope.drawTriangleCentered(color: Color, center: Offset, sizePx: Size) {
    val left = center.x - sizePx.width / 2f
    val right = center.x + sizePx.width / 2f
    val top = center.y - sizePx.height / 2f
    val bottom = center.y + sizePx.height / 2f
    val path = Path().apply {
        moveTo(center.x, top)
        lineTo(right, bottom)
        lineTo(left, bottom)
        close()
    }
    drawPath(path = path, color = color)
}

private fun DrawScope.drawTrapezoidCentered(color: Color, center: Offset, sizePx: Size) {
    val left = center.x - sizePx.width / 2f
    val right = center.x + sizePx.width / 2f
    val top = center.y - sizePx.height / 2f
    val bottom = center.y + sizePx.height / 2f
    val inset = sizePx.width * 0.18f
    val path = Path().apply {
        moveTo(left + inset, top)
        lineTo(right - inset, top)
        lineTo(right, bottom)
        lineTo(left, bottom)
        close()
    }
    drawPath(path = path, color = color)
}

private fun DrawScope.drawWaveCentered(color: Color, center: Offset, sizePx: Size, phase: Double) {
    val left = center.x - sizePx.width / 2f
    val right = center.x + sizePx.width / 2f
    val midY = center.y
    val bottom = center.y + sizePx.height / 2f
    val amplitude = sizePx.height * 0.25f
    val path = Path().apply {
        moveTo(left, midY)
        var x = left
        while (x <= right) {
            val t = (x - left) / sizePx.width
            val y = midY + sin(t * PI * 2 + phase).toFloat() * amplitude
            lineTo(x, y)
            x += 4f
        }
        lineTo(right, bottom)
        lineTo(left, bottom)
        close()
    }
    drawPath(path = path, color = color)
}

private fun DrawScope.drawTreeCentered(color: Color, center: Offset, sizePx: Size) {
    val w = sizePx.width
    val h = sizePx.height
    val left = center.x - w / 2f
    val right = center.x + w / 2f
    val top = center.y - h / 2f
    val bottom = center.y + h / 2f
    val mid = center.x

    val path = Path().apply {
        // 잎(삼각형 2단)
        moveTo(mid, top)
        lineTo(right, top + h * 0.45f)
        lineTo(mid + w * 0.22f, top + h * 0.45f)
        lineTo(right, top + h * 0.75f)
        lineTo(mid + w * 0.1f, top + h * 0.75f)
        // 몸통
        lineTo(mid + w * 0.1f, bottom)
        lineTo(mid - w * 0.1f, bottom)
        lineTo(mid - w * 0.1f, top + h * 0.75f)
        lineTo(left, top + h * 0.75f)
        lineTo(mid - w * 0.22f, top + h * 0.45f)
        lineTo(left, top + h * 0.45f)
        close()
    }
    drawPath(path = path, color = color)
}

private fun DrawScope.drawCloudCentered(color: Color, center: Offset, sizePx: Size) {
    val r = sizePx.height / 2f
    val left = center.x - sizePx.width / 2f
    val top = center.y - sizePx.height / 2f
    drawOval(
        color = color,
        topLeft = Offset(left, top + r * 0.3f),
        size = Size(r * 2f, r * 1.6f),
    )
    drawOval(
        color = color,
        topLeft = Offset(left + r * 0.9f, top),
        size = Size(r * 2.4f, r * 2f),
    )
    drawOval(
        color = color,
        topLeft = Offset(left + r * 2.2f, top + r * 0.4f),
        size = Size(r * 2f, r * 1.5f),
    )
}

private fun DrawScope.drawRectCentered(color: Color, center: Offset, sizePx: Size) {
    drawRect(
        color = color,
        topLeft = Offset(center.x - sizePx.width / 2f, center.y - sizePx.height / 2f),
        size = sizePx,
    )
}

/** 4꼭짓점 별. iOS의 SF Symbol `sparkle` 대용. */
private fun DrawScope.drawStar(color: Color, center: Offset, radius: Float) {
    val path = Path().apply {
        moveTo(center.x, center.y - radius)
        lineTo(center.x + radius * 0.35f, center.y - radius * 0.35f)
        lineTo(center.x + radius, center.y)
        lineTo(center.x + radius * 0.35f, center.y + radius * 0.35f)
        lineTo(center.x, center.y + radius)
        lineTo(center.x - radius * 0.35f, center.y + radius * 0.35f)
        lineTo(center.x - radius, center.y)
        lineTo(center.x - radius * 0.35f, center.y - radius * 0.35f)
        close()
    }
    drawPath(path = path, color = color)
}
