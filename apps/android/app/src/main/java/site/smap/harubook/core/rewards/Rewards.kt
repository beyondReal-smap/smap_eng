package site.smap.harubook.core.rewards

import site.smap.harubook.core.models.LearningSummary

/**
 * 포인트·배지 보상 규칙 — 웹 `src/lib/rewards.ts` 미러(웹이 단일 소스).
 *
 * 저장소 없는 "파생 집계" 방식: 포인트는 `/api/learning-summary` 집계값(LearningSummary)의
 * 순수 함수다. 원장(ledger) 테이블이 없으므로 멱등성이 자동 보장되고, 규칙값을 바꾸면
 * 과거 기록에도 일관되게 소급된다.
 *
 * 톤 원칙(웹 learning-summary와 동일한 "압박 없는" 철학):
 * 획득한 것만 축하한다. "N점 더 모으면" 같은 결핍 프레이밍 금지.
 */
object PointRules {
    /** 완독 세션 1회 (reading_logs.finishedAt 존재) */
    const val FINISH_SESSION: Int = 10

    /** 퀴즈 만점 1회 (quizScore == 5) */
    const val PERFECT_QUIZ: Int = 20

    /** 단어 마스터 1개 (vocab_progress.level >= 3) */
    const val MASTERED_WORD: Int = 5
}

/** 누적 포인트 — 웹 `computePoints` 동일 식. */
fun computePoints(summary: LearningSummary): Int =
    summary.totalFinishedSessions * PointRules.FINISH_SESSION +
        summary.totalPerfectScores * PointRules.PERFECT_QUIZ +
        summary.masteredWords * PointRules.MASTERED_WORD

/** 퀴즈 제출 직후 결과 화면에 보여줄 "이번 세션" 획득 포인트 — 웹 `sessionPoints` 동일. */
fun sessionPoints(isPerfect: Boolean): Int =
    PointRules.FINISH_SESSION + if (isPerfect) PointRules.PERFECT_QUIZ else 0

data class BadgeDef(
    val id: String,
    val emoji: String,
    val title: String,
    /** 달성 시점에 보여줄 축하 문구 — 결핍/압박 표현 금지. */
    val description: String,
    val earned: (LearningSummary) -> Boolean,
)

/** 배지 정의 — 웹 `BADGES` 미러. 달성 조건이 낮은 것부터, 전부 "이미 이룬 것"만 표시한다. */
val BADGES: List<BadgeDef> = listOf(
    BadgeDef(
        id = "first-book",
        emoji = "🌱",
        title = "첫 걸음",
        description = "첫 번째 책을 끝까지 읽었어요",
        earned = { it.totalBooksRead >= 1 },
    ),
    BadgeDef(
        id = "bookworm",
        emoji = "📚",
        title = "책벌레",
        description = "책 5권을 완독했어요",
        earned = { it.totalBooksRead >= 5 },
    ),
    BadgeDef(
        id = "first-perfect",
        emoji = "🏆",
        title = "퍼펙트",
        description = "퀴즈 만점을 처음 받았어요",
        earned = { it.totalPerfectScores >= 1 },
    ),
    BadgeDef(
        id = "quiz-master",
        emoji = "🌟",
        title = "퀴즈 마스터",
        description = "퀴즈 만점을 3번 받았어요",
        earned = { it.totalPerfectScores >= 3 },
    ),
    BadgeDef(
        id = "word-collector",
        emoji = "🧠",
        title = "단어 수집가",
        description = "단어 10개를 마스터했어요",
        earned = { it.masteredWords >= 10 },
    ),
    BadgeDef(
        id = "word-doctor",
        emoji = "💎",
        title = "단어 박사",
        description = "단어 50개를 마스터했어요",
        earned = { it.masteredWords >= 50 },
    ),
)

/** 획득한 배지만 — 웹 `earnedBadges` 동일. */
fun earnedBadges(summary: LearningSummary): List<BadgeDef> = BADGES.filter { it.earned(summary) }
