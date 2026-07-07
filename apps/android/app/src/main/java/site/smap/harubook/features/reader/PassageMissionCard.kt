package site.smap.harubook.features.reader

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import site.smap.harubook.core.models.Mission
import site.smap.harubook.core.models.MissionCheck
import site.smap.harubook.core.models.MissionWordHunt
import site.smap.harubook.designsystem.SmapAccent
import site.smap.harubook.designsystem.SmapBadgeStyle
import site.smap.harubook.designsystem.SmapBodyEmphasisStyle
import site.smap.harubook.designsystem.SmapBodyStyle
import site.smap.harubook.designsystem.SmapBorder
import site.smap.harubook.designsystem.SmapCaptionStyle
import site.smap.harubook.designsystem.SmapDanger
import site.smap.harubook.designsystem.SmapLevelA1
import site.smap.harubook.designsystem.SmapMuted
import site.smap.harubook.designsystem.SmapPrimary
import site.smap.harubook.designsystem.SmapPrimarySoft
import site.smap.harubook.designsystem.SmapSurface
import site.smap.harubook.designsystem.SmapText

/**
 * 책 속 미션 카드 — 웹 `passage-mission.tsx` 패리티. 현재 passage에 미션이 있을 때 본문 아래 노출.
 *
 * - wordHunt: 완료 판정은 본문 밑줄 단어 탭(ReaderViewModel.reportWordTapped)에서 일어나므로
 *   이 카드는 힌트/완료 상태 표시만 담당한다(완료 신호는 done 파라미터로 수신).
 * - check: 2지선다 선택을 카드 내부에서 처리하고 정답 시 onComplete를 호출한다.
 *   오답은 부드럽게 재시도 유도 — 감점/실패 카운트 없음(압박 없는 톤).
 *
 * 미션당 wordHunt/check 중 하나만 오는 게 정상이지만, 둘 다 온 경우에도 각각 렌더하고
 * 어느 쪽이든 먼저 완료되면 미션 완료로 간주한다(웹과 동일). 미션은 진행을 막지 않는다.
 */
@Composable
fun PassageMissionCard(
    mission: Mission,
    done: Boolean,
    onComplete: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(
        modifier = modifier.fillMaxWidth(),
        verticalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        mission.wordHunt?.let { hunt ->
            WordHuntCard(hunt = hunt, done = done)
        }
        mission.check?.let { check ->
            CheckCard(check = check, done = done, onComplete = onComplete)
        }
    }
}

/** 점선 테두리 — 웹 border-dashed 패리티. Compose border는 실선만 지원해 직접 그린다. */
private fun Modifier.dashedBorder(
    color: Color,
    cornerRadius: Dp,
    strokeWidth: Dp = 2.dp,
): Modifier = drawBehind {
    drawRoundRect(
        color = color,
        style = Stroke(
            width = strokeWidth.toPx(),
            pathEffect = PathEffect.dashPathEffect(floatArrayOf(12f, 8f), 0f),
        ),
        cornerRadius = CornerRadius(cornerRadius.toPx()),
    )
}

@Composable
private fun WordHuntCard(hunt: MissionWordHunt, done: Boolean) {
    val shape = RoundedCornerShape(16.dp)
    if (done) {
        // 성공 톤 — 웹 level-a1(연녹) 카드 패리티.
        Text(
            text = "🎉 찾았어요! ${hunt.targetWord}",
            style = SmapBodyEmphasisStyle,
            color = SmapText,
            modifier = Modifier
                .fillMaxWidth()
                .background(SmapLevelA1.copy(alpha = 0.4f), shape)
                .border(2.dp, SmapLevelA1, shape)
                .padding(14.dp),
        )
        return
    }
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .background(SmapPrimarySoft.copy(alpha = 0.35f), shape)
            .dashedBorder(SmapPrimary.copy(alpha = 0.4f), cornerRadius = 16.dp)
            .padding(14.dp),
        verticalArrangement = Arrangement.spacedBy(4.dp),
    ) {
        Text(text = "🔍 단어 찾기 미션", style = SmapBadgeStyle, color = SmapPrimary)
        Text(text = hunt.hintKo, style = SmapBodyStyle.copy(fontSize = 15.sp), color = SmapText)
        Text(
            text = "위 문장에서 밑줄 친 단어를 눌러 보세요",
            style = SmapCaptionStyle.copy(fontSize = 11.sp),
            color = SmapMuted,
        )
    }
}

@Composable
private fun CheckCard(
    check: MissionCheck,
    done: Boolean,
    onComplete: () -> Unit,
) {
    // 마지막으로 고른 오답 인덱스 — 재시도 가능하게 유지. 웹 wrongPick 패리티.
    var wrongPick by remember(check) { mutableStateOf<Int?>(null) }
    val shape = RoundedCornerShape(16.dp)

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .then(
                if (done) {
                    Modifier
                        .background(SmapLevelA1.copy(alpha = 0.4f), shape)
                        .border(2.dp, SmapLevelA1, shape)
                } else {
                    Modifier
                        .background(SmapAccent.copy(alpha = 0.15f), shape)
                        .dashedBorder(SmapAccent, cornerRadius = 16.dp)
                },
            )
            .padding(14.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        // 라벨 — 웹은 accent 텍스트지만 SmapAccent(파스텔)는 명도 대비가 부족해
        // 면/테두리에만 쓰고 텍스트는 SmapText 유지.
        Text(
            text = if (done) "✅ 통과!" else "🧩 깜짝 질문",
            style = SmapBadgeStyle,
            color = SmapText,
        )
        Text(text = check.question, style = SmapBodyStyle.copy(fontSize = 15.sp), color = SmapText)

        check.choices.forEachIndexed { ci, choice ->
            val isAnswer = ci == check.answerIndex
            val isWrong = wrongPick == ci
            val choiceShape = RoundedCornerShape(12.dp)
            val background = when {
                done && isAnswer -> SmapLevelA1
                isWrong -> SmapDanger.copy(alpha = 0.1f)
                else -> SmapSurface
            }
            val borderColor = when {
                done && isAnswer -> Color.Transparent
                isWrong -> SmapDanger.copy(alpha = 0.4f)
                else -> SmapBorder
            }
            val foreground = if (isWrong && !done) SmapDanger else SmapText
            Text(
                text = choice,
                style = if (done && isAnswer) {
                    SmapBodyEmphasisStyle.copy(fontSize = 15.sp)
                } else {
                    SmapBodyStyle.copy(fontSize = 15.sp)
                },
                color = foreground,
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(choiceShape)
                    .background(background)
                    .border(1.dp, borderColor, choiceShape)
                    .clickable(enabled = !done) {
                        if (ci == check.answerIndex) {
                            wrongPick = null
                            onComplete()
                        } else {
                            wrongPick = ci
                        }
                    }
                    .padding(horizontal = 12.dp, vertical = 10.dp),
            )
        }

        if (wrongPick != null && !done) {
            Text(
                text = "괜찮아요, 문장을 다시 읽고 한 번 더 골라 볼까요?",
                style = SmapCaptionStyle.copy(fontSize = 11.sp),
                color = SmapMuted,
            )
        }
    }
}
