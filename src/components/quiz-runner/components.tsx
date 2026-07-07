'use client';

import { useMemo } from 'react';
import { Sparkles } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import type { Book } from '@/lib/db/schema';

export function ScoreHeader({
  book,
  score,
  total,
  earnedPoints,
}: {
  book: Book;
  score: number;
  total: number;
  /** 이번 세션 획득 포인트 — 있으면 점수 아래에 축하 배지로 표시. */
  earnedPoints?: number;
}) {
  const ratio = score / total;
  const emoji = ratio === 1 ? '🏆' : ratio >= 0.6 ? '🎉' : '💪';
  const label =
    ratio === 1 ? '만점!' : ratio >= 0.6 ? '잘했어요' : '한 번 더 읽어볼까요?';
  const pct = Math.round(ratio * 100);
  return (
    <article className="animate-pop-in relative overflow-hidden rounded-3xl border-2 border-border bg-card p-8 text-center sticker-shadow-lg">
      <div className="relative">
        <div
          className={`mx-auto mb-2 inline-block text-6xl ${
            ratio === 1 ? 'animate-trophy' : ''
          }`}
        >
          {emoji}
        </div>
        <h2 className="text-3xl font-extrabold tabular-nums">
          <span className="text-primary">{score}</span>
          <span className="text-muted-foreground"> / {total}</span>
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {label} · {book.title}
        </p>
        {earnedPoints !== undefined && earnedPoints > 0 ? (
          <p className="animate-bounce-in mx-auto mt-3 inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-sm font-bold text-primary">
            ✨ +{earnedPoints}P 획득!
          </p>
        ) : null}
        <div className="mx-auto mt-5 max-w-sm">
          <Progress value={pct} className="h-2.5 rounded-full" />
          <p className="mt-1 text-xs font-medium text-primary">{pct}%</p>
        </div>
      </div>
    </article>
  );
}

/** CSS keyframe 기반 confetti — 외부 라이브러리 없음, 24 pieces, 1.6s 후 자동 소멸.
 * 2026-04-26 D7: 시각 부담 완화를 위해 40→24개, 회전 범위 1440→1080deg로 축소. */
export function ConfettiBurst() {
  const pieces = useMemo(() => {
    const colors = [
      'var(--primary)',
      'var(--accent)',
      'var(--chart-3)',
      'var(--chart-4)',
      'var(--chart-5)',
    ];
    return Array.from({ length: 24 }, (_, i) => {
      const x = (Math.random() - 0.5) * 460;
      const r = (Math.random() - 0.5) * 1080;
      const delay = Math.random() * 240;
      const color = colors[i % colors.length];
      return { x, r, delay, color, left: 12 + Math.random() * 76 };
    });
  }, []);
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-x-0 top-20 z-50 mx-auto h-[500px] max-w-6xl overflow-visible"
    >
      {pieces.map((p, i) => (
        <span
          key={i}
          className="confetti-piece"
          style={
            {
              left: `${p.left}%`,
              background: p.color,
              animationDelay: `${p.delay}ms`,
              '--x': `${p.x}px`,
              '--r': `${p.r}deg`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}

export function GeneratingState() {
  return (
    <div className="animate-pop-in flex flex-col items-center rounded-3xl border-2 border-dashed border-border/80 bg-card py-16 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Sparkles aria-hidden className="h-6 w-6" />
      </div>
      <h3 className="mt-4 text-lg font-bold">퀴즈를 만들고 있어요</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        10~30초쯤 걸려요. 잠깐만 기다려 주세요.
      </p>
      <div className="mt-4 w-48">
        <div className="shimmer h-2 w-full rounded-full" />
      </div>
    </div>
  );
}

/**
 * 즉시 피드백 토글 — 헤더에 위치.
 * ON이면 답 선택 즉시 정/오와 해설이 표시된다. OFF는 기존(일괄 채점).
 * 기본 OFF(Codex 토론 Round 2 결과 + 2024 메타분석).
 */
export function ImmediateToggle({
  value,
  onChange,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      onClick={() => onChange(!value)}
      className="hidden items-center gap-2 rounded-full border border-border/60 bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:bg-muted sm:inline-flex"
      title="답을 고르면 바로 정/오답을 보여줘요"
    >
      <span
        aria-hidden
        className={`relative h-4 w-7 shrink-0 rounded-full transition-colors ${value ? 'bg-primary' : 'bg-muted-foreground/30'}`}
      >
        <span
          className={`absolute top-0.5 left-0.5 h-3 w-3 rounded-full bg-background shadow-sm transition-transform ${value ? 'translate-x-3' : ''}`}
        />
      </span>
      <span className={value ? 'text-foreground' : ''}>즉시 피드백</span>
    </button>
  );
}

