package site.smap.harubook.features.quiz

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import site.smap.harubook.core.rewards.sessionPoints
import site.smap.harubook.designsystem.A2zFontFamily
import site.smap.harubook.designsystem.PrimaryButton
import site.smap.harubook.designsystem.PrimaryButtonVariant
import site.smap.harubook.designsystem.SmapBackground
import site.smap.harubook.designsystem.SmapBodyEmphasisStyle
import site.smap.harubook.designsystem.SmapDisplayStyle
import site.smap.harubook.designsystem.SmapHeadingStyle
import site.smap.harubook.designsystem.SmapMuted
import site.smap.harubook.designsystem.SmapPrimary
import site.smap.harubook.designsystem.SmapPrimarySoft
import site.smap.harubook.designsystem.SmapText

/**
 * 퀴즈 결과 화면 — iOS `QuizResultView.swift` 패리티.
 *
 * 큰 이모지(점수별 4단계) + 4단계 헤드라인 + 큰 점수(56sp 코랄) + 퍼센트 점수 + 두 버튼.
 * 이전엔 2단계 헤드라인 + 일반 아이콘 + 격려 메시지 위주라 iOS 의 시각적 임팩트가 없었다.
 */
@Composable
fun QuizResultScreen(
    score: Int,
    total: Int,
    onRestart: () -> Unit,
    onClose: () -> Unit,
) {
    val percentage = if (total > 0) ((score.toDouble() / total.toDouble()) * 100).toInt() else 0

    val (emoji, headline) = when {
        percentage == 100 -> "🌟" to "완벽해요!"
        percentage in 80..99 -> "🎉" to "아주 잘했어요!"
        percentage in 60..79 -> "👍" to "조금만 더 연습해 보아요"
        else -> "💪" to "다시 한 번 도전!"
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(SmapBackground)
            .padding(horizontal = 24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        Spacer(Modifier.weight(1f))

        // iOS 88pt 이모지 패리티.
        Text(text = emoji, fontSize = 88.sp)

        Spacer(Modifier.height(20.dp))
        Text(text = headline, style = SmapDisplayStyle, color = SmapText)

        Spacer(Modifier.height(20.dp))
        // 큰 점수 — 56sp heavy rounded 코랄. iOS 와 동일한 시각적 위계.
        Text(
            text = "$score / $total",
            fontSize = 56.sp,
            fontWeight = FontWeight.Black,
            fontFamily = A2zFontFamily,
            color = SmapPrimary,
        )
        Spacer(Modifier.height(6.dp))
        Text(text = "${percentage}점", style = SmapHeadingStyle, color = SmapMuted)

        Spacer(Modifier.height(14.dp))
        // 이번 세션 획득 포인트 — 웹 quiz-runner ScoreHeader earnedPoints 패리티(만점 30P, 그 외 10P).
        Text(
            text = "✨ +${sessionPoints(isPerfect = total > 0 && score == total)}P 획득!",
            style = SmapBodyEmphasisStyle.copy(fontSize = 14.sp),
            color = SmapPrimary,
            modifier = Modifier
                .background(SmapPrimarySoft, CircleShape)
                .padding(horizontal = 12.dp, vertical = 5.dp),
        )

        Spacer(Modifier.weight(1f))

        Column(
            modifier = Modifier.fillMaxWidth(),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            PrimaryButton(title = "다시 풀기", variant = PrimaryButtonVariant.Tonal, onClick = onRestart)
            PrimaryButton(title = "책장으로 돌아가기", onClick = onClose)
        }
        Spacer(Modifier.height(32.dp))
    }
}
