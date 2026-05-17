package site.smap.harubook.features.store

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Star
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import site.smap.harubook.designsystem.PrimaryButton
import site.smap.harubook.designsystem.PrimaryButtonVariant
import site.smap.harubook.designsystem.SmapBackground
import site.smap.harubook.designsystem.SmapBodyStyle
import site.smap.harubook.designsystem.SmapBorder
import site.smap.harubook.designsystem.SmapCaptionStyle
import site.smap.harubook.designsystem.SmapMuted
import site.smap.harubook.designsystem.SmapPrimary
import site.smap.harubook.designsystem.SmapPrimarySoft
import site.smap.harubook.designsystem.SmapSurface
import site.smap.harubook.designsystem.SmapText
import site.smap.harubook.designsystem.SmapTitleStyle

/**
 * 별 충전(IAP) — iOS StoreView 패리티는 Google Play Billing v6 통합이 필요해 별도 트랙으로 분리.
 * 현재 화면은 "준비 중" placeholder. 웹 결제로 우회 가능함을 안내.
 */
@Composable
fun StoreScreen(onBack: () -> Unit) {
    Column(modifier = Modifier.fillMaxSize().background(SmapBackground)) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 12.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Icon(
                Icons.AutoMirrored.Filled.ArrowBack,
                contentDescription = "뒤로",
                tint = SmapText,
                modifier = Modifier.size(28.dp).clickable(onClick = onBack),
            )
            Text("별 충전", style = SmapTitleStyle, color = SmapText)
        }

        Column(
            modifier = Modifier.fillMaxSize().padding(horizontal = 24.dp, vertical = 16.dp),
            verticalArrangement = Arrangement.spacedBy(20.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Spacer(Modifier.height(40.dp))
            Icon(
                Icons.Filled.Star,
                contentDescription = null,
                tint = SmapPrimary,
                modifier = Modifier
                    .size(96.dp)
                    .background(SmapPrimarySoft, RoundedCornerShape(percent = 50))
                    .padding(16.dp),
            )
            Text("안드로이드 별 충전은 곧 만나요", style = SmapTitleStyle, color = SmapText, textAlign = TextAlign.Center)

            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(SmapSurface, RoundedCornerShape(16.dp))
                    .border(1.dp, SmapBorder, RoundedCornerShape(16.dp))
                    .padding(20.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                Text(
                    "Google Play 인앱 결제 정책에 따른 정식 결제 모듈을 준비 중입니다. " +
                        "당분간은 웹(eng.smap.site)에서 결제해 주세요.",
                    style = SmapBodyStyle,
                    color = SmapText,
                    textAlign = TextAlign.Center,
                )
                Text(
                    "결제·환불 정책은 설정 > 약관 및 정책 > 환불정책 에서 확인할 수 있어요.",
                    style = SmapCaptionStyle,
                    color = SmapMuted,
                    textAlign = TextAlign.Center,
                )
            }

            PrimaryButton(title = "돌아가기", variant = PrimaryButtonVariant.Tonal, onClick = onBack)
        }
    }
}
