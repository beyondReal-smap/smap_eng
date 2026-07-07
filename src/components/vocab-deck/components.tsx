'use client';

import { Loader2, Volume2 } from 'lucide-react';
import type { MouseEvent } from 'react';
import type { CardState } from '@/lib/srs';

export type Tab = 'review' | 'unknown' | 'all';

export function DailyGoalBar({ done, goal }: { done: number; goal: number }) {
  const ratio = Math.min(1, done / goal);
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5 text-[13px] font-bold text-[color:var(--primary)]">
        <span aria-hidden="true">🎯</span>
        <span>오늘 {done} / {goal} 단어</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full bg-[color:var(--primary)] transition-all duration-300"
          style={{ width: `${ratio * 100}%` }}
        />
      </div>
    </div>
  );
}

/// 세션 완료 축하 카드 — Duolingo/Anki 패턴. 오늘 학습한 단어 수 + 누적 마스터.
export function SessionCompleteCard({
  todayCount,
  masteredCount,
}: {
  todayCount: number;
  masteredCount: number;
}) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-3xl border border-border bg-card p-8 text-center">
      <div className="flex h-24 w-24 items-center justify-center rounded-full bg-[color:var(--primary)]/15 text-5xl">
        ✓
      </div>
      <div className="space-y-1">
        <h3 className="text-2xl font-black text-foreground">오늘 학습 완료!</h3>
        <p className="text-sm text-muted-foreground">
          오늘 {todayCount}개 단어를 학습했어요
        </p>
      </div>
      {masteredCount > 0 ? (
        <span className="inline-flex items-center gap-1 rounded-full bg-[color:var(--primary)]/15 px-3 py-1 text-sm font-bold text-[color:var(--primary)]">
          ★ 누적 마스터 {masteredCount}개
        </span>
      ) : null}
      <p className="max-w-[280px] text-xs text-muted-foreground">
        다음 복습은 단어마다 정해진 시간에 다시 알려드릴게요.
      </p>
    </div>
  );
}

/// 단어 카드 좌상단 학습 상태 칩 — 새 / 다시 학습 / 학습 중 / (마스터는 deck에서 빠짐).
export function CardStateChip({ state, level }: { state: CardState; level: number }) {
  if (state === 'mastered') return null;

  const config = (() => {
    switch (state) {
      case 'new':
        return { label: 'NEW', emoji: '✨', fg: '#1E6FB8', bg: '#E2F0FB' };
      case 'relearning':
        return { label: '다시 학습', emoji: '↻', fg: '#C73E1F', bg: '#FDE2DD' };
      case 'learning':
        return { label: `Lv.${level}`, emoji: '🎓', fg: '#8A6300', bg: '#FCEDC1' };
    }
  })();

  return (
    <span
      className="pointer-events-none absolute left-3 top-3 z-10 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold"
      style={{ color: config.fg, backgroundColor: config.bg }}
    >
      <span aria-hidden="true">{config.emoji}</span>
      <span>{config.label}</span>
    </span>
  );
}

export function TabBar({
  tab,
  onChange,
  dueCount,
  unknownCount,
  totalCount,
  masteredCount,
}: {
  tab: Tab;
  onChange: (t: Tab) => void;
  dueCount: number;
  unknownCount: number;
  totalCount: number;
  masteredCount: number;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div
        role="tablist"
        className="inline-flex flex-wrap rounded-full border border-border bg-card p-0.5"
      >
        <TabItem
          active={tab === 'review'}
          onClick={() => onChange('review')}
          label="오늘 학습"
          badge={dueCount}
        />
        <TabItem
          active={tab === 'unknown'}
          onClick={() => onChange('unknown')}
          label="다시 학습"
          badge={unknownCount}
        />
        <TabItem
          active={tab === 'all'}
          onClick={() => onChange('all')}
          label="전체"
          badge={totalCount}
        />
      </div>
      {masteredCount > 0 ? (
        <span className="inline-flex items-center gap-1 rounded-full bg-[color:var(--primary)]/15 px-2.5 py-1 text-xs font-bold text-[color:var(--primary)]">
          ✓ 마스터 {masteredCount}
        </span>
      ) : null}
    </div>
  );
}

export function TabItem({
  active,
  onClick,
  label,
  badge,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  badge: number;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`relative rounded-full px-3 py-1.5 text-xs font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
        active
          ? 'bg-primary text-primary-foreground shadow-sm'
          : 'text-muted-foreground hover:text-foreground'
      }`}
    >
      {label}
      <span className="ml-1.5 rounded bg-background/40 px-1.5 text-[10px] tabular-nums">
        {badge}
      </span>
    </button>
  );
}

export function GradeButton({
  label,
  tone,
  onClick,
}: {
  label: string;
  tone: 'destructive' | 'good';
  onClick: () => void;
}) {
  const toneClass =
    tone === 'destructive'
      ? 'border-[color:var(--destructive)]/40 bg-[color:var(--destructive)]/10 text-[color:var(--destructive)] hover:bg-[color:var(--destructive)]/15'
      : 'border-[color:var(--level-a1)]/60 bg-[color:var(--level-a1)]/50 text-[color:var(--level-a1-fg)] hover:bg-[color:var(--level-a1)]/70';
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center justify-center rounded-xl border py-3 text-base font-bold transition press-scale focus:outline-none focus-visible:ring-2 focus-visible:ring-ring ${toneClass}`}
    >
      {label}
    </button>
  );
}

/**
 * 발음 재생 버튼 — 카드(button) 안의 내포된 button 충돌을 피하려고 <span role="button">.
 * 부모 카드 버튼은 flip, 이 버튼은 TTS 재생이라 역할이 다르다.
 */
export function PronounceButton({
  word,
  onSpeak,
  speaking,
  size = 'md',
}: {
  word: string;
  onSpeak: (word: string) => void;
  speaking: boolean;
  size?: 'sm' | 'md';
}) {
  function handle(e: MouseEvent) {
    e.stopPropagation();
    e.preventDefault();
    if (speaking) return;
    onSpeak(word);
  }
  const dim = size === 'sm' ? 'h-7 w-7' : 'h-10 w-10';
  const icon = size === 'sm' ? 'h-3.5 w-3.5' : 'h-5 w-5';
  // TTS 첫 합성은 1~3초 걸릴 수 있어, 명시적 spinner가 없으면 사용자가
  // 버튼이 안 눌린 줄 알고 연타한다. speaking 중에는 Loader2(spin)로 교체 +
  // 클릭 차단 + aria-busy 표시.
  return (
    <span
      role="button"
      aria-label={`${word} 듣기`}
      aria-busy={speaking}
      aria-disabled={speaking}
      tabIndex={0}
      onClick={handle}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.stopPropagation();
          e.preventDefault();
          if (speaking) return;
          onSpeak(word);
        }
      }}
      className={`inline-flex ${dim} shrink-0 items-center justify-center rounded-full border border-border bg-card text-primary shadow-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
        speaking
          ? 'cursor-wait opacity-70'
          : 'hover:bg-primary hover:text-primary-foreground'
      }`}
    >
      {speaking ? (
        <Loader2 aria-hidden className={`${icon} animate-spin`} />
      ) : (
        <Volume2 aria-hidden className={icon} />
      )}
    </span>
  );
}

export function Skeleton() {
  return (
    <div className="space-y-5">
      <div className="shimmer h-2 w-full rounded-full" />
      <div className="shimmer h-64 w-full rounded-2xl" />
    </div>
  );
}
