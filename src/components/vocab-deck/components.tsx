'use client';

import { BadgeCheck, Shuffle, Star } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type Tab = 'review' | 'unknown' | 'all';

const TAB_LABEL: Record<Tab, string> = {
  review: '오늘',
  unknown: '다시 볼 단어',
  all: '전체',
};

/* ---------- 오늘 진행 칩 ---------- */

/**
 * 헤더 오른쪽 "오늘 N / 20" 칩 — 작은 링 + 숫자. 목표를 넘겨도 분자는 분모를 넘지 않게("20 / 20 ✓"),
 * 넘친 개수는 스크린 리더 문구로만 알린다(iOS 8차).
 */
export function DailyProgressChip({ done, goal }: { done: number; goal: number }) {
  const ratio = Math.min(1, done / goal);
  const achieved = done >= goal;
  const r = 10;
  const circumference = 2 * Math.PI * r;
  const spoken =
    done > goal
      ? `오늘의 목표 ${goal}단어 달성, 오늘 ${done}단어 학습했어요`
      : done === goal
        ? `오늘의 목표 ${goal}단어 달성`
        : `오늘의 목표 ${goal}단어 중 ${done}단어 학습`;
  return (
    <span className="inline-flex h-[38px] items-center gap-2 rounded-full bg-white pl-2 pr-3 shadow-[0_4px_10px_rgb(168_111_63/0.1)]">
      <svg aria-hidden viewBox="0 0 26 26" className="size-[26px] -rotate-90">
        <circle cx="13" cy="13" r={r} fill="none" stroke="var(--haru-coral-soft)" strokeWidth="4" />
        <circle
          cx="13"
          cy="13"
          r={r}
          fill="none"
          stroke="var(--haru-coral)"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - Math.max(0.001, ratio))}
          className="transition-[stroke-dashoffset] duration-500 motion-reduce:transition-none"
        />
      </svg>
      <span aria-hidden className="text-sm font-extrabold tabular-nums text-haru-ink">
        오늘 {Math.min(done, goal)} / {goal}
        {achieved ? ' ✓' : ''}
      </span>
      <span className="sr-only">{spoken}</span>
    </span>
  );
}

/* ---------- 칩 줄 ---------- */

/** 칩 3개(선택 = 흰 바탕 + 코랄 밑줄, 미선택 = 흰 70%) + 오른쪽 섞기 아이콘 버튼. */
export function TabChips({
  tab,
  onChange,
  counts,
  onShuffle,
  canShuffle,
}: {
  tab: Tab;
  onChange: (t: Tab) => void;
  counts: Record<Tab, number>;
  onShuffle: () => void;
  canShuffle: boolean;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <div role="group" aria-label="단어 고르기" className="flex min-w-0 flex-wrap items-center gap-1.5">
        {(Object.keys(TAB_LABEL) as Tab[]).map((t) => {
          const active = tab === t;
          return (
            <button
              key={t}
              type="button"
              aria-pressed={active}
              aria-label={`${TAB_LABEL[t]}, ${counts[t]}개`}
              onClick={() => onChange(t)}
              className="group flex min-h-11 items-center rounded-[14px] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring"
            >
              <span
                className={cn(
                  'inline-flex items-center gap-1 whitespace-nowrap rounded-[14px] px-3 py-[7px] text-[13px] font-bold transition-colors',
                  active
                    ? 'bg-white text-haru-coral-ink shadow-[0_2px_0_var(--haru-coral),0_4px_10px_rgb(168_111_63/0.08)]'
                    : 'bg-white/70 text-haru-muted group-hover:bg-white',
                )}
              >
                {TAB_LABEL[t]}
                <span className="tabular-nums text-haru-muted">{counts[t]}</span>
              </span>
            </button>
          );
        })}
      </div>
      <button
        type="button"
        onClick={onShuffle}
        disabled={!canShuffle}
        aria-label="카드 섞기"
        title="카드 섞기 (S)"
        className="group ml-auto flex size-11 shrink-0 items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-40"
      >
        <span className="flex size-[34px] items-center justify-center rounded-full bg-white/70 text-haru-coral-ink transition-colors group-hover:bg-white">
          <Shuffle aria-hidden className="size-4" strokeWidth={2.5} />
        </span>
      </button>
    </div>
  );
}

/* ---------- 하단 알약 버튼 ---------- */

/** 하단 알약 버튼(높이 64) — "뒤집어 보기"/"다시 볼래요"/"알았어요". */
export function PillButton({
  children,
  onClick,
  variant,
  ink = 'ink',
  label,
  disabled,
}: {
  children: ReactNode;
  onClick: () => void;
  /** outline = 흰 바탕 + 연한 테두리, filled = 코랄 채움 + 짙은 글자. */
  variant: 'outline' | 'filled';
  /** outline 글자색. */
  ink?: 'ink' | 'coral';
  /** 이모지를 뺀 스크린 리더 이름. */
  label?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      disabled={disabled}
      className={cn(
        'inline-flex min-h-16 flex-1 items-center justify-center gap-1.5 rounded-full px-4 text-[17px] font-extrabold transition-transform active:scale-[0.98] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-50 motion-reduce:transition-none',
        variant === 'filled'
          ? 'bg-haru-coral text-haru-on-coral shadow-[0_8px_16px_rgb(245_131_92/0.35)]'
          : cn(
              'border-[2.5px] border-[#ebc9b6] bg-white',
              ink === 'coral' ? 'text-haru-coral-ink' : 'text-haru-ink',
            ),
      )}
    >
      {children}
    </button>
  );
}

/* ---------- 상태 ---------- */

/** 세션 완료 축하 — 오늘 학습한 단어 수 + 누적 마스터(Duolingo/Anki 패턴). */
export function SessionCompleteCard({
  todayCount,
  masteredCount,
}: {
  todayCount: number;
  masteredCount: number;
}) {
  return (
    <div className="flex flex-col items-center gap-4 px-8 py-10 text-center">
      <div aria-hidden className="flex size-24 items-center justify-center rounded-full bg-haru-coral-soft text-haru-coral-ink">
        <BadgeCheck className="size-12" strokeWidth={2.5} />
      </div>
      <div className="space-y-1.5">
        <h2 className="text-2xl font-extrabold text-haru-ink">오늘 학습 완료!</h2>
        <p className="text-sm font-bold text-haru-muted">오늘 {todayCount}개 단어를 학습했어요</p>
      </div>
      {masteredCount > 0 ? (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-haru-coral-soft px-3 py-1.5 text-[13px] font-bold text-haru-coral-ink">
          <Star aria-hidden className="size-3.5 fill-current" />
          누적 마스터 {masteredCount}개
        </span>
      ) : null}
      <p className="max-w-[280px] text-[13px] text-haru-muted">
        다음 복습은 단어마다 정해진 시간에 다시 알려드릴게요.
      </p>
    </div>
  );
}

/** 탭에 보여 줄 카드가 없을 때 — 칩 아래 가운데. */
export function EmptyTab({ tab }: { tab: Tab }) {
  const copy: Record<Tab, [string, string]> = {
    review: ['오늘 학습할 단어가 없어요', "잠시 쉬거나 '전체' 칩에서 다시 훑어 보세요."],
    unknown: ['다시 볼 단어가 없어요', "'다시 볼래요'를 누른 단어가 모이면 여기에 나타나요."],
    all: ['단어가 없어요', '책을 더 읽으면 단어가 쌓여요.'],
  };
  const [title, text] = copy[tab];
  return (
    <div className="flex flex-col items-center gap-1.5 px-6 py-16 text-center">
      <p className="text-lg font-extrabold text-haru-ink">{title}</p>
      <p className="text-sm font-bold text-haru-muted">{text}</p>
    </div>
  );
}

/** 불러오는 중 — 칩 줄 + 카드 자리(loading.tsx와 같은 모양). */
export function Skeleton() {
  return (
    <div aria-hidden className="space-y-3.5">
      <div className="flex min-h-11 items-center gap-1.5">
        <span className="h-8 w-16 rounded-[14px] bg-white/60" />
        <span className="h-8 w-24 rounded-[14px] bg-white/60" />
        <span className="h-8 w-16 rounded-[14px] bg-white/60" />
      </div>
      <div className="mx-auto mt-[52px] h-[430px] max-w-[336px] animate-pulse rounded-[26px] border border-[#f0e0cc] bg-haru-paper/80 motion-reduce:animate-none" />
    </div>
  );
}
