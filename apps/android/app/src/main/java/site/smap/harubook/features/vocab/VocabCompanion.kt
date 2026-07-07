package site.smap.harubook.features.vocab

import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.spring
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import site.smap.harubook.designsystem.SmapBodyStyle
import site.smap.harubook.designsystem.SmapBorder
import site.smap.harubook.designsystem.SmapSurface
import site.smap.harubook.designsystem.SmapText

/**
 * 단어장 학습 컴패니언 — 웹 `vocab-deck/companion.tsx` 패리티(이모지 스텁).
 *
 * 렌더 레이어만 담당하는 프레젠테이션 컴포넌트: 상태 전이(정답/오답/축하 → idle
 * 복귀 타이머)는 VocabViewModel이 소유한다. 추후 캐릭터 애니메이션으로 승격할 때
 * 이 파일 내부만 교체하면 되도록 상태 계약(CompanionState)을 고정해 둔다.
 *
 * 톤: 오답도 격려만 한다 — 압박/결핍 문구 금지.
 */
enum class CompanionState { Idle, Correct, Wrong, Celebrate }

private fun faceOf(state: CompanionState): String = when (state) {
    CompanionState.Idle -> "🦉"
    CompanionState.Correct -> "🥳"
    CompanionState.Wrong -> "🤗"
    CompanionState.Celebrate -> "🎉"
}

private fun messagesOf(state: CompanionState): List<String> = when (state) {
    CompanionState.Idle -> listOf(
        "같이 외워 볼까?",
        "준비되면 카드를 눌러 봐!",
        "오늘도 반가워!",
    )
    CompanionState.Correct -> listOf("잘했어!", "대단한걸?", "좋아, 하나 더!", "척척박사네!")
    CompanionState.Wrong -> listOf(
        "괜찮아, 다시 만나면 기억날 거야!",
        "어려운 단어야. 한 번 더 보자!",
        "천천히 해도 돼!",
    )
    CompanionState.Celebrate -> listOf("와, 정말 멋져! 🏅", "오늘의 주인공이야!", "최고야, 축하해!")
}

@Composable
fun VocabCompanion(
    state: CompanionState,
    /** 같은 state가 연속돼도 연출·문구가 갱신되도록 하는 카운터 — 웹 pulse 패리티. */
    pulse: Int,
    modifier: Modifier = Modifier,
) {
    val messages = messagesOf(state)
    val message = messages[pulse % messages.size]

    // 상태 전환 시 가벼운 스케일 바운스 — 웹 animate-bounce-in 대응.
    // (state, pulse) 키로 연속 정답에서도 연출이 다시 재생된다.
    val scale = remember { Animatable(1f) }
    LaunchedEffect(state, pulse) {
        if (state == CompanionState.Idle) {
            scale.snapTo(1f)
        } else {
            scale.snapTo(0.6f)
            scale.animateTo(
                targetValue = 1f,
                animationSpec = spring(
                    dampingRatio = Spring.DampingRatioMediumBouncy,
                    stiffness = Spring.StiffnessMedium,
                ),
            )
        }
    }

    Row(
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(10.dp),
        modifier = modifier,
    ) {
        Box(
            modifier = Modifier
                .size(44.dp)
                .graphicsLayer {
                    scaleX = scale.value
                    scaleY = scale.value
                }
                .background(SmapSurface, CircleShape)
                .border(2.dp, SmapBorder, CircleShape),
            contentAlignment = Alignment.Center,
        ) {
            Text(text = faceOf(state), fontSize = 22.sp)
        }
        // 말풍선 — 좌하단 모서리만 좁혀 캐릭터 쪽을 가리키게(웹 rounded-bl-sm 패리티).
        val bubbleShape = RoundedCornerShape(
            topStart = 16.dp,
            topEnd = 16.dp,
            bottomEnd = 16.dp,
            bottomStart = 4.dp,
        )
        Text(
            text = message,
            style = SmapBodyStyle.copy(fontSize = 15.sp),
            color = SmapText,
            modifier = Modifier
                .background(SmapSurface, bubbleShape)
                .border(1.dp, SmapBorder, bubbleShape)
                .padding(horizontal = 12.dp, vertical = 6.dp),
        )
    }
}
