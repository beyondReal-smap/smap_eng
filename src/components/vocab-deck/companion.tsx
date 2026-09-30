'use client';

import { Mascot, type MascotPose } from '@/components/haru';

/**
 * 단어장 학습 컴패니언 — 그림책 곰(2026-09-30, 기존 부엉이 이모지 대체).
 *
 * 렌더 레이어만 담당하는 프레젠테이션 컴포넌트: 상태 전이(정답/오답/축하 → idle
 * 복귀 타이머)는 부모(vocab-deck)가 소유한다. 상태 계약(CompanionState)은 iOS/Android와 같다.
 * 곰은 카드 **뒤**에서 윗변 위로 머리만 내밀고(카드 내용을 가리지 않게), 말풍선은 반응할 때만
 * 카드 앞 윗변 위에 잠깐 뜬다(iOS VocabCompanionView 8차).
 *
 * 톤: 오답도 격려만 한다 — 압박/결핍 문구 금지.
 */

export type CompanionState = 'idle' | 'correct' | 'wrong' | 'celebrate';

/** 카드 윗변 위로 보이는 곰 높이(px) — 나머지는 카드 뒤에 숨는다. */
export const COMPANION_PEEK = 44;

// 상태별 곰 포즈 — iOS VocabCompanionView와 같은 매핑(오답도 격려: 책 읽는 곰).
const POSE: Record<CompanionState, MascotPose> = {
  idle: 'normal',
  correct: 'cheer',
  wrong: 'reading',
  celebrate: 'cheer',
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

/** 카드 오른쪽 위에 걸터앉은 곰(70). 장식이라 스크린 리더에서 숨긴다. */
export function VocabCompanionMascot({
  state,
  pulse,
}: {
  state: CompanionState;
  /** 같은 state가 연속돼도 연출이 다시 재생되도록 하는 카운터. */
  pulse: number;
}) {
  return (
    <span
      // key로 재마운트를 강제해 연속 정답에서도 애니메이션이 다시 재생되게 한다.
      key={`${state}-${pulse}`}
      aria-hidden
      className={`inline-flex origin-bottom motion-reduce:animate-none ${ANIMATION[state]}`}
    >
      <Mascot pose={POSE[state]} size={70} />
    </span>
  );
}

/**
 * 반응 말풍선 — idle이면 그리지 않는다. 꼬리는 오른쪽(곰 쪽).
 * 문구는 스크린 리더에도 알린다(role=status).
 */
export function VocabCompanionBubble({
  state,
  pulse,
  messageOverride,
}: {
  state: CompanionState;
  pulse: number;
  /** 순환 대사 대신 보여 줄 고정 대사(예: "오늘 목표 달성!"). */
  messageOverride?: string | null;
}) {
  const messages = MESSAGES[state];
  const message = messageOverride ?? messages[pulse % messages.length];
  return (
    <div role="status" aria-live="polite" className="pointer-events-none">
      {state !== 'idle' ? (
        <div
          key={`${state}-${pulse}`}
          className="relative mr-[10px] max-w-[190px] animate-pop-in [filter:drop-shadow(0_6px_8px_rgb(168_111_63/0.14))] motion-reduce:animate-none"
        >
          <p className="rounded-[20px] bg-white px-4 py-[11px] text-sm font-bold leading-snug text-haru-ink">
            {message}
          </p>
          <svg aria-hidden viewBox="0 0 11 20" className="absolute bottom-[10px] right-[-10px] h-5 w-[11px] fill-white">
            <path d="M0 0 L11 10 L0 20 Z" />
          </svg>
        </div>
      ) : null}
    </div>
  );
}
