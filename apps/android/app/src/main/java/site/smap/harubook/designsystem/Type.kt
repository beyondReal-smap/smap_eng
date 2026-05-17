package site.smap.harubook.designsystem

import androidx.compose.material3.Typography
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp
import site.smap.harubook.R

/**
 * iOS HaruBook `Typography.swift` + `Font+AtoZ.swift` 미러.
 *
 * 웹 랜딩/메인과 동일한 손글씨 폰트 A2Z(AtoZ). 9 weight 중 핵심 3개(Regular/Bold/Black)만 번들.
 * PostScript name 매칭이 필요한 iOS와 달리 Android 는 res/font 파일을 weight 메타로 매칭한다.
 */
val A2zFontFamily: FontFamily = FontFamily(
    Font(R.font.a2z_regular, FontWeight.Normal),
    Font(R.font.a2z_bold, FontWeight.Bold),
    Font(R.font.a2z_black, FontWeight.Black),
)

val SmapDisplayStyle      = TextStyle(fontSize = 34.sp, fontWeight = FontWeight.Black,  fontFamily = A2zFontFamily)
val SmapTitleStyle        = TextStyle(fontSize = 28.sp, fontWeight = FontWeight.Black,  fontFamily = A2zFontFamily)
val SmapHeadingStyle      = TextStyle(fontSize = 22.sp, fontWeight = FontWeight.Bold,   fontFamily = A2zFontFamily)
val SmapBodyStyle         = TextStyle(fontSize = 17.sp, fontWeight = FontWeight.Normal, fontFamily = A2zFontFamily)
val SmapBodyEmphasisStyle = TextStyle(fontSize = 17.sp, fontWeight = FontWeight.Bold,   fontFamily = A2zFontFamily)
val SmapCaptionStyle      = TextStyle(fontSize = 13.sp, fontWeight = FontWeight.Normal, fontFamily = A2zFontFamily)
val SmapBadgeStyle        = TextStyle(fontSize = 12.sp, fontWeight = FontWeight.Bold,   fontFamily = A2zFontFamily)

/**
 * Reader 본문 — iOS atozRegular(22). 이전엔 Serif 폴백을 두던 옛 코드가 잘못이었다.
 * A2Z Regular 로 통일해 디자인 일관성 유지.
 */
val SmapReaderStyle       = TextStyle(fontSize = 22.sp, fontWeight = FontWeight.Normal, fontFamily = A2zFontFamily)

val SmapTypography = Typography(
    displayLarge = SmapDisplayStyle,
    titleLarge   = SmapTitleStyle,
    titleMedium  = SmapHeadingStyle,
    bodyLarge    = SmapBodyStyle,
    bodyMedium   = SmapBodyEmphasisStyle,
    bodySmall    = SmapCaptionStyle,
    labelSmall   = SmapBadgeStyle,
)
