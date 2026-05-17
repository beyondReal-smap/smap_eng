package site.smap.harubook.features.createbook

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.CircularProgressIndicator
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
import site.smap.harubook.designsystem.SmapDanger
import site.smap.harubook.designsystem.SmapMuted
import site.smap.harubook.designsystem.SmapPrimary
import site.smap.harubook.designsystem.SmapText
import site.smap.harubook.designsystem.SmapTitleStyle

@Composable
fun GeneratingStep(
    isGenerating: Boolean,
    error: String?,
    onRetry: () -> Unit,
    onCancel: () -> Unit,
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(SmapBackground)
            .padding(horizontal = 24.dp, vertical = 32.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        if (isGenerating) {
            CircularProgressIndicator(color = SmapPrimary, strokeWidth = 3.dp)
            Spacer(Modifier.height(24.dp))
            Text("동화를 만들고 있어요", style = SmapTitleStyle, color = SmapText)
            Spacer(Modifier.height(8.dp))
            Text(
                "잠시만 기다려 주세요. 길어야 1~2분 정도 걸려요.",
                style = SmapBodyStyle,
                color = SmapMuted,
                textAlign = TextAlign.Center,
            )
        } else if (!error.isNullOrBlank()) {
            Text("앗, 잠시 문제가 있었어요", style = SmapTitleStyle, color = SmapText)
            Spacer(Modifier.height(8.dp))
            Text(error, style = SmapBodyStyle, color = SmapDanger, textAlign = TextAlign.Center)
            Spacer(Modifier.height(20.dp))
            PrimaryButton(title = "다시 시도", onClick = onRetry)
            Spacer(Modifier.height(8.dp))
            PrimaryButton(title = "닫기", variant = PrimaryButtonVariant.Tonal, onClick = onCancel)
        }
    }
}
