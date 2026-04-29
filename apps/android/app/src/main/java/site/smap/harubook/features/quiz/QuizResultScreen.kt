package site.smap.harubook.features.quiz

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import site.smap.harubook.designsystem.PrimaryButton
import site.smap.harubook.designsystem.PrimaryButtonVariant
import site.smap.harubook.designsystem.SmapBackground
import site.smap.harubook.designsystem.SmapBodyStyle
import site.smap.harubook.designsystem.SmapDisplayStyle
import site.smap.harubook.designsystem.SmapHeadingStyle
import site.smap.harubook.designsystem.SmapMuted
import site.smap.harubook.designsystem.SmapPrimary
import site.smap.harubook.designsystem.SmapText

@Composable
fun QuizResultScreen(
    bookTitle: String,
    score: Int,
    total: Int,
    onRetry: () -> Unit,
    onClose: () -> Unit,
) {
    val percentage = if (total > 0) (score * 100) / total else 0
    val emoji = when {
        percentage == 100 -> "🌟"
        percentage in 80..99 -> "🎉"
        percentage in 60..79 -> "👍"
        else -> "💪"
    }
    val headline = when {
        percentage == 100 -> "완벽해요!"
        percentage in 80..99 -> "아주 잘했어요!"
        percentage in 60..79 -> "조금만 더 연습해 보아요"
        else -> "다시 한 번 도전!"
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(SmapBackground)
            .padding(horizontal = 24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(24.dp),
    ) {
        Spacer(Modifier.weight(1f))
        Text(emoji, style = SmapDisplayStyle.copy(fontSize = 88.sp))
        Text(headline, style = SmapDisplayStyle, color = SmapText)
        Text(
            text = bookTitle,
            style = SmapBodyStyle,
            color = SmapMuted,
            textAlign = TextAlign.Center,
        )
        Text("$score / $total", style = SmapDisplayStyle.copy(fontSize = 56.sp), color = SmapPrimary)
        Text("${percentage}점", style = SmapHeadingStyle, color = SmapMuted)
        Spacer(Modifier.weight(1f))
        Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
            PrimaryButton(title = "다시 풀기", variant = PrimaryButtonVariant.Tonal, onClick = onRetry)
            PrimaryButton(title = "책장으로 돌아가기", onClick = onClose)
        }
        Spacer(Modifier.padding(bottom = 16.dp))
    }
}
