package site.smap.harubook.designsystem

import androidx.compose.material3.Typography
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp

/**
 * iOS HaruBook `Typography.swift` 미러.
 *
 * iOS는 A2Z 손글씨 폰트를 쓰지만 안드로이드 번들에 폰트 자산을 아직 포함하지 않았으므로
 * 가중치로 시각 위계를 보존한다. 폰트 패밀리 추가 시 [FontFamily.Default]만 교체하면 된다.
 */
private val Base = FontFamily.Default

val SmapDisplayStyle      = TextStyle(fontSize = 34.sp, fontWeight = FontWeight.Black,    fontFamily = Base)
val SmapTitleStyle        = TextStyle(fontSize = 28.sp, fontWeight = FontWeight.Black,    fontFamily = Base)
val SmapHeadingStyle      = TextStyle(fontSize = 22.sp, fontWeight = FontWeight.Bold,     fontFamily = Base)
val SmapBodyStyle         = TextStyle(fontSize = 17.sp, fontWeight = FontWeight.Normal,   fontFamily = Base)
val SmapBodyEmphasisStyle = TextStyle(fontSize = 17.sp, fontWeight = FontWeight.Bold,     fontFamily = Base)
val SmapCaptionStyle      = TextStyle(fontSize = 13.sp, fontWeight = FontWeight.Normal,   fontFamily = Base)
val SmapBadgeStyle        = TextStyle(fontSize = 12.sp, fontWeight = FontWeight.Bold,     fontFamily = Base)
val SmapReaderStyle       = TextStyle(fontSize = 22.sp, fontWeight = FontWeight.Normal,   fontFamily = FontFamily.Serif)

val SmapTypography = Typography(
    displayLarge = SmapDisplayStyle,
    titleLarge   = SmapTitleStyle,
    titleMedium  = SmapHeadingStyle,
    bodyLarge    = SmapBodyStyle,
    bodyMedium   = SmapBodyEmphasisStyle,
    bodySmall    = SmapCaptionStyle,
    labelSmall   = SmapBadgeStyle,
)
