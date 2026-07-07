'use client';

import { useState } from 'react';
import type { Mission } from '@/lib/db/schema';

/**
 * 책 속 미션 카드 — 현재 passage에 미션이 있을 때 본문 아래에 노출.
 *
 * - wordHunt: 완료 판정은 본문(PassageText)의 밑줄 단어 탭에서 일어나므로
 *   이 카드는 힌트/완료 상태 표시만 담당한다(완료 신호는 done prop으로 수신).
 * - check: 2지선다 선택을 카드 내부에서 처리하고 정답 시 onComplete를 호출한다.
 *   오답은 부드럽게 재시도 유도 — 감점/실패 카운트 없음(압박 없는 톤).
 *
 * 프롬프트는 미션당 wordHunt/check 중 하나만 채우도록 유도하지만, 둘 다 온
 * 경우에도 각각 렌더하고 어느 쪽이든 먼저 완료되면 미션 완료로 간주한다.
 */
export function PassageMission({
  mission,
  done,
  onComplete,
}: {
  mission: Mission;
  done: boolean;
  onComplete: () => void;
}) {
  return (
    <div className="mt-4 space-y-2" aria-live="polite">
      {mission.wordHunt ? (
        <WordHuntCard hunt={mission.wordHunt} done={done} />
      ) : null}
      {mission.check ? (
        <CheckCard check={mission.check} done={done} onComplete={onComplete} />
      ) : null}
    </div>
  );
}

function WordHuntCard({
  hunt,
  done,
}: {
  hunt: NonNullable<Mission['wordHunt']>;
  done: boolean;
}) {
  if (done) {
    return (
      <div className="animate-bounce-in rounded-2xl border-2 border-[color:var(--level-a1)] bg-[color:var(--level-a1)]/40 p-3.5 text-sm font-bold text-[color:var(--level-a1-fg)]">
        🎉 찾았어요! <span className="underline decoration-wavy decoration-2 underline-offset-4">{hunt.targetWord}</span>
      </div>
    );
  }
  return (
    <div className="rounded-2xl border-2 border-dashed border-primary/40 bg-primary/5 p-3.5">
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-primary">
        🔍 단어 찾기 미션
      </p>
      <p className="mt-1 text-sm font-medium leading-relaxed">
        {hunt.hintKo}
      </p>
      <p className="mt-1 text-[11px] text-muted-foreground">
        위 문장에서 밑줄 친 단어를 눌러 보세요
      </p>
    </div>
  );
}

function CheckCard({
  check,
  done,
  onComplete,
}: {
  check: NonNullable<Mission['check']>;
  done: boolean;
  onComplete: () => void;
}) {
  // 마지막으로 고른 오답 인덱스 — 흔들기 연출 후 재시도 가능하게 유지.
  const [wrongPick, setWrongPick] = useState<number | null>(null);

  function pick(ci: number) {
    if (done) return;
    if (ci === check.answerIndex) {
      setWrongPick(null);
      onComplete();
    } else {
      // 재선택 시 애니메이션이 다시 트리거되도록 null 경유.
      setWrongPick(null);
      window.requestAnimationFrame(() => setWrongPick(ci));
    }
  }

  return (
    <div
      className={`rounded-2xl border-2 p-3.5 ${
        done
          ? 'animate-bounce-in border-[color:var(--level-a1)] bg-[color:var(--level-a1)]/40'
          : 'border-dashed border-[color:var(--accent)]/40 bg-[color:var(--accent)]/5'
      }`}
    >
      <p
        className={`text-xs font-bold uppercase tracking-[0.12em] ${
          done ? 'text-[color:var(--level-a1-fg)]' : 'text-[color:var(--accent)]'
        }`}
      >
        {done ? '✅ 통과!' : '🧩 깜짝 질문'}
      </p>
      <p className="mt-1 text-sm font-medium leading-relaxed">
        {check.question}
      </p>
      <div className="mt-2.5 grid gap-1.5 sm:grid-cols-2">
        {check.choices.map((c, ci) => {
          const isAnswer = ci === check.answerIndex;
          const isWrong = wrongPick === ci;
          let state = '';
          if (done && isAnswer) {
            state =
              'border-transparent bg-[color:var(--level-a1)] font-bold text-[color:var(--level-a1-fg)]';
          } else if (isWrong) {
            state =
              'border-[color:var(--destructive)]/40 bg-[color:var(--destructive)]/10 text-[color:var(--destructive)] animate-shake-no';
          } else {
            state = 'border-border/60 bg-background hover:bg-muted/60';
          }
          return (
            <button
              key={ci}
              type="button"
              onClick={() => pick(ci)}
              disabled={done}
              className={`rounded-xl border px-3 py-2 text-left text-sm font-medium transition ${done ? '' : 'press-scale'} ${state}`}
            >
              {c}
            </button>
          );
        })}
      </div>
      {wrongPick !== null && !done ? (
        <p className="mt-2 text-[11px] font-medium text-muted-foreground">
          괜찮아요, 문장을 다시 읽고 한 번 더 골라 볼까요?
        </p>
      ) : null}
    </div>
  );
}
