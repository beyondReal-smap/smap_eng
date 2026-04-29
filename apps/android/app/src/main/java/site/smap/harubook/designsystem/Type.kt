package site.smap.harubook.designsystem

import androidx.compose.material3.Typography
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp

val SmapDisplayStyle = TextStyle(fontSize = 32.sp, fontWeight = FontWeight.ExtraBold, fontFamily = FontFamily.Default)
val SmapTitleStyle = TextStyle(fontSize = 24.sp, fontWeight = FontWeight.Bold, fontFamily = FontFamily.Default)
val SmapHeadingStyle = TextStyle(fontSize = 20.sp, fontWeight = FontWeight.SemiBold, fontFamily = FontFamily.Default)
val SmapBodyStyle = TextStyle(fontSize = 17.sp, fontWeight = FontWeight.Normal, fontFamily = FontFamily.Default)
val SmapBodyEmphasisStyle = TextStyle(fontSize = 17.sp, fontWeight = FontWeight.SemiBold, fontFamily = FontFamily.Default)
val SmapCaptionStyle = TextStyle(fontSize = 13.sp, fontWeight = FontWeight.Normal, fontFamily = FontFamily.Default)
val SmapBadgeStyle = TextStyle(fontSize = 12.sp, fontWeight = FontWeight.Bold, fontFamily = FontFamily.Default)
val SmapReaderStyle = TextStyle(fontSize = 22.sp, fontWeight = FontWeight.Normal, fontFamily = FontFamily.Serif)

val SmapTypography = Typography(
    displayLarge = SmapDisplayStyle,
    titleLarge = SmapTitleStyle,
    titleMedium = SmapHeadingStyle,
    bodyLarge = SmapBodyStyle,
    bodyMedium = SmapBodyEmphasisStyle,
    bodySmall = SmapCaptionStyle,
    labelSmall = SmapBadgeStyle,
)
