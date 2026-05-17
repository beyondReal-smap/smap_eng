package site.smap.harubook.features.quiz

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Celebration
import androidx.compose.material.icons.filled.SentimentSatisfied
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
import site.smap.harubook.designsystem.SmapDisplayStyle
import site.smap.harubook.designsystem.SmapHeadingStyle
import site.smap.harubook.designsystem.SmapMuted
import site.smap.harubook.designsystem.SmapPrimary
import site.smap.harubook.designsystem.SmapPrimaryForeground
import site.smap.harubook.designsystem.SmapPrimarySoft
import site.smap.harubook.designsystem.SmapText

@Composable
fun QuizResultScreen(
    score: Int,
    total: Int,
    onRestart: () -> Unit,
    onClose: () -> Unit,
) {
    val perfect = score == total
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(SmapBackground)
            .padding(horizontal = 24.dp, vertical = 40.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        androidx.compose.foundation.layout.Box(
            modifier = Modifier
                .size(120.dp)
                .background(SmapPrimarySoft, CircleShape),
            contentAlignment = Alignment.Center,
        ) {
            Icon(
                imageVector = if (perfect) Icons.Filled.Celebration else Icons.Filled.SentimentSatisfied,
                contentDescription = null,
                tint = SmapPrimary,
                modifier = Modifier.size(64.dp),
            )
        }
        Spacer(Modifier.height(20.dp))

        Text(
            text = if (perfect) "완벽해요!" else "잘했어요!",
            style = SmapDisplayStyle,
            color = SmapText,
        )
        Spacer(Modifier.height(6.dp))
        Text(
            text = "${score} / ${total} 문제 정답",
            style = SmapHeadingStyle,
            color = SmapPrimaryForeground,
        )

        Spacer(Modifier.height(16.dp))
        Text(
            text = if (perfect) "모든 문제를 맞혔어요. 정말 멋져요!" else "다시 도전하면 더 잘할 수 있을 거예요.",
            style = SmapBodyStyle,
            color = SmapMuted,
            textAlign = TextAlign.Center,
        )

        Spacer(Modifier.height(28.dp))

        Column(modifier = Modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            PrimaryButton(title = "다시 풀기", variant = PrimaryButtonVariant.Tonal, onClick = onRestart)
            PrimaryButton(title = "책장으로", onClick = onClose)
        }
    }
}
