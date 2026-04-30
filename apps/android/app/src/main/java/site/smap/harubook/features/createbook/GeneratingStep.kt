package site.smap.harubook.features.createbook

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.WarningAmber
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import site.smap.harubook.designsystem.PrimaryButton
import site.smap.harubook.designsystem.PrimaryButtonVariant
import site.smap.harubook.designsystem.SmapBodyStyle
import site.smap.harubook.designsystem.SmapDanger
import site.smap.harubook.designsystem.SmapHeadingStyle
import site.smap.harubook.designsystem.SmapMuted
import site.smap.harubook.designsystem.SmapPrimary
import site.smap.harubook.designsystem.SmapPrimarySoft
import site.smap.harubook.designsystem.SmapText

@Composable
fun GeneratingStep(
    state: CreateBookUiState,
    onRetry: () -> Unit,
    onCancel: () -> Unit,
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(horizontal = 24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(20.dp),
    ) {
        Spacer(Modifier.weight(1f))
        if (state.generationError != null) {
            Icon(
                Icons.Filled.WarningAmber,
                contentDescription = null,
                tint = SmapDanger,
                modifier = Modifier.size(56.dp),
            )
            Text("동화 생성에 실패했어요", style = SmapHeadingStyle, color = SmapText)
            Text(
                state.generationError,
                style = SmapBodyStyle,
                color = SmapMuted,
                textAlign = TextAlign.Center,
            )
            Spacer(Modifier.size(8.dp))
            Box(modifier = Modifier.padding(horizontal = 24.dp)) {
                PrimaryButton(title = "다시 시도", onClick = onRetry)
            }
            PrimaryButton(title = "닫기", variant = PrimaryButtonVariant.Tonal, onClick = onCancel)
        } else {
            Box(
                modifier = Modifier
                    .size(120.dp)
                    .background(SmapPrimarySoft, CircleShape),
                contentAlignment = Alignment.Center,
            ) {
                CircularProgressIndicator(color = SmapPrimary)
            }
            Text("동화를 만들고 있어요…", style = SmapHeadingStyle, color = SmapText)
            Text(
                "OpenAI가 이야기를 짓는 데 30초 ~ 2분 정도 걸려요.\n잠시만 기다려 주세요.",
                style = SmapBodyStyle,
                color = SmapMuted,
                textAlign = TextAlign.Center,
            )
        }
        Spacer(Modifier.weight(1f))
    }
}
