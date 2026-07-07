/**
 * 포인트·배지 보상 규칙 — 단일 소스.
 *
 * 저장소 없는 "파생 집계" 방식: 포인트는 reading_logs·vocab_progress에서 나온
 * 집계값(LearningSummary)의 순수 함수다. 원장(ledger) 테이블이 없으므로
 * 멱등성이 자동 보장되고, 규칙값을 바꾸면 과거 기록에도 일관되게 소급된다.
 * 미션 완료 등 로그에 없는 이벤트를 포인트화해야 할 때 원장 도입을 재검토.
 *
 * 톤 원칙(learning-summary/components.tsx의 "압박 없는" 철학과 동일):
 * 획득한 것만 축하한다. "N점 더 모으면" 같은 결핍 프레이밍 금지.
 */

/** 이벤트별 포인트 규칙값. 파생 집계라 값 변경 시 누적 포인트도 함께 재계산된다. */
export const POINT_RULES = {
  /** 완독 세션 1회 (reading_logs.finishedAt 존재) */
  finishSession: 10,
  /** 퀴즈 만점 1회 (quizScore === 5) */
  perfectQuiz: 20,
  /** 단어 마스터 1개 (vocab_progress.level >= 3) */
  masteredWord: 5,
} as const;

/** 포인트·배지 판정에 필요한 집계 입력 — LearningSummary의 부분집합. */
export interface RewardStats {
  /** 완독 세션 수 (재독 포함) */
  totalFinishedSessions: number;
  /** 퀴즈 만점 횟수 */
  totalPerfectScores: number;
  /** 완독한 책 수 (distinct) */
  totalBooksRead: number;
  /** 마스터한 단어 수 (level >= 3) */
  masteredWords: number;
}

export function computePoints(s: RewardStats): number {
  return (
    s.totalFinishedSessions * POINT_RULES.finishSession +
    s.totalPerfectScores * POINT_RULES.perfectQuiz +
    s.masteredWords * POINT_RULES.masteredWord
  );
}

/** 퀴즈 제출 직후 결과 화면에 보여줄 "이번 세션" 획득 포인트. */
export function sessionPoints(isPerfect: boolean): number {
  return (
    POINT_RULES.finishSession + (isPerfect ? POINT_RULES.perfectQuiz : 0)
  );
}

export interface BadgeDef {
  id: string;
  emoji: string;
  title: string;
  /** 달성 시점에 보여줄 축하 문구 — 결핍/압박 표현 금지. */
  description: string;
  earned: (s: RewardStats) => boolean;
}

/** 배지 정의 — 달성 조건이 낮은 것부터. 전부 "이미 이룬 것"만 표시한다. */
export const BADGES: BadgeDef[] = [
  {
    id: 'first-book',
    emoji: '🌱',
    title: '첫 걸음',
    description: '첫 번째 책을 끝까지 읽었어요',
    earned: (s) => s.totalBooksRead >= 1,
  },
  {
    id: 'bookworm',
    emoji: '📚',
    title: '책벌레',
    description: '책 5권을 완독했어요',
    earned: (s) => s.totalBooksRead >= 5,
  },
  {
    id: 'first-perfect',
    emoji: '🏆',
    title: '퍼펙트',
    description: '퀴즈 만점을 처음 받았어요',
    earned: (s) => s.totalPerfectScores >= 1,
  },
  {
    id: 'quiz-master',
    emoji: '🌟',
    title: '퀴즈 마스터',
    description: '퀴즈 만점을 3번 받았어요',
    earned: (s) => s.totalPerfectScores >= 3,
  },
  {
    id: 'word-collector',
    emoji: '🧠',
    title: '단어 수집가',
    description: '단어 10개를 마스터했어요',
    earned: (s) => s.masteredWords >= 10,
  },
  {
    id: 'word-doctor',
    emoji: '💎',
    title: '단어 박사',
    description: '단어 50개를 마스터했어요',
    earned: (s) => s.masteredWords >= 50,
  },
];

export function earnedBadges(s: RewardStats): BadgeDef[] {
  return BADGES.filter((b) => b.earned(s));
}
