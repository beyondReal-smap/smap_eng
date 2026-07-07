'use client';

/**
 * 단어장 학습 컴패니언 — CSS/이모지 스텁.
 *
 * 렌더 레이어만 담당하는 프레젠테이션 컴포넌트: 상태 전이(정답/오답/축하 → idle
 * 복귀 타이머)는 부모(vocab-deck)가 소유한다. 추후 Rive 캐릭터로 승격할 때
 * 이 파일 내부만 교체하면 되도록 상태 계약(CompanionState)을 고정해 둔다.
 * Rive 도입 시 번들 영향이 생기므로 그때 next/dynamic 지연 로드로 전환할 것.
 *
 * 톤: 오답도 격려만 한다 — 압박/결핍 문구 금지.
 */

export type CompanionState = 'idle' | 'correct' | 'wrong' | 'celebrate';

const FACE: Record<CompanionState, string> = {
  idle: '🦉',
  correct: '🥳',
  wrong: '🤗',
  celebrate: '🎉',
};

const MESSAGES: Record<CompanionState, string[]> = {
  idle: [
    '같이 외워 볼까?',
    '준비되면 카드를 눌러 봐!',
    '오늘도 반가워!',
  ],
  correct: ['잘했어!', '대단한걸?', '좋아, 하나 더!', '척척박사네!'],
  wrong: [
    '괜찮아, 다시 만나면 기억날 거야!',
    '어려운 단어야. 한 번 더 보자!',
    '천천히 해도 돼!',
  ],
  celebrate: ['와, 정말 멋져! 🏅', '오늘의 주인공이야!', '최고야, 축하해!'],
};

const ANIMATION: Record<CompanionState, string> = {
  idle: '',
  correct: 'animate-bounce-in',
  wrong: 'animate-fade-up',
  celebrate: 'animate-trophy',
};

export function VocabCompanion({
  state,
  pulse,
}: {
  state: CompanionState;
  /** 같은 state가 연속돼도 연출·문구가 갱신되도록 하는 카운터. */
  pulse: number;
}) {
  const messages = MESSAGES[state];
  const message = messages[pulse % messages.length];
  return (
    <div
      className="flex items-center gap-2.5"
      role="status"
      aria-live="polite"
    >
      <span
        // key로 재마운트를 강제해 연속 정답에서도 애니메이션이 다시 재생되게 한다.
        key={`${state}-${pulse}`}
        aria-hidden
        className={`inline-flex size-11 shrink-0 items-center justify-center rounded-full border-2 border-border/70 bg-card text-2xl sticker-shadow motion-reduce:animate-none ${ANIMATION[state]}`}
      >
        {FACE[state]}
      </span>
      <p className="rounded-2xl rounded-bl-sm border border-border/60 bg-card px-3 py-1.5 text-sm font-medium text-foreground/90">
        {message}
      </p>
    </div>
  );
}
