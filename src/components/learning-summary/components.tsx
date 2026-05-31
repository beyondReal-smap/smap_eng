'use client';

import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { ArrowRight, BookMarked, CalendarDays } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import type { BookProgressStat } from '@/lib/db/queries';
import type { Book } from '@/lib/db/schema';
import { CoverArt } from '../cover-art';

const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

/**
 * 이번 달 달력. 활동이 있던 날만 색칠.
 * 숫자 streak/압박 문구 없이 "이번 달을 한눈에 본다"는 용도.
 *
 * month: "YYYY-MM" 형식. 해당 달의 1일 ~ 말일까지 렌더.
 */
export function MonthlyTrace({
  month,
  activeDays,
}: {
  month: string;
  activeDays: string[];
}) {
  const [y, m] = month.split('-').map(Number);
  const first = new Date(y, m - 1, 1);
  const last = new Date(y, m, 0);
  const daysInMonth = last.getDate();
  const leadingBlanks = first.getDay(); // 0=일 ~ 6=토
  const activeSet = new Set(activeDays);
  const todayYmd = new Date().toISOString().slice(0, 10);

  // 요일 헤더 + 앞쪽 공백 셀 + 날짜 셀. 6주 x 7일 = 최대 42칸.
  const cells: Array<{ ymd: string; day: number } | null> = [];
  for (let i = 0; i < leadingBlanks; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const ymd = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    cells.push({ ymd, day: d });
  }
  // 다음 달 첫 주까지 나머지는 빈 칸으로 채워 폭 일관.
  while (cells.length % 7 !== 0) cells.push(null);

  const activeCount = activeDays.length;

  return (
    <div className="w-full rounded-2xl border-2 border-border/80 bg-background/70 p-4 sticker-shadow md:ml-auto">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <span
            aria-hidden
            className="mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary"
          >
            <CalendarDays className="size-4" />
          </span>
          <div>
            <h3 className="text-lg font-bold tracking-tight sm:text-xl">
              {y}년 {m}월 흔적
            </h3>
            <p className="text-xs font-medium text-muted-foreground">
              {activeCount > 0 ? `${activeCount}일 활동했어요` : '첫 활동을 기다리는 중'}
            </p>
          </div>
        </div>
        <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold tabular-nums text-muted-foreground">
          {activeCount}/{daysInMonth}
        </span>
      </div>
      <div className="grid grid-cols-7 gap-1">
        {WEEKDAY_LABELS.map((w, i) => (
          <div
            key={w}
            className={`text-center text-[10px] font-medium ${
              i === 0
                ? 'text-[color:var(--destructive)]/70'
                : 'text-muted-foreground'
            }`}
          >
            {w}
          </div>
        ))}
        {cells.map((c, i) =>
          c === null ? (
            <div
              key={`blank-${i}`}
              className="aspect-[4/3]"
              aria-hidden
            />
          ) : (
            <div
              key={c.ymd}
              className="relative flex aspect-[4/3] items-center justify-center"
              title={`${c.ymd}${activeSet.has(c.ymd) ? ' · 활동' : ''}`}
            >
              <div
                className={`flex h-full w-full items-center justify-center rounded-md border text-xs transition-colors sm:text-sm ${
                  activeSet.has(c.ymd)
                    ? 'border-transparent bg-primary font-bold text-primary-foreground sticker-shadow-primary'
                    : c.ymd === todayYmd
                      ? 'border-dashed border-border bg-transparent font-semibold text-foreground'
                      : 'border-transparent bg-muted text-muted-foreground'
                }`}
                aria-label={`${c.ymd}${activeSet.has(c.ymd) ? ' 활동 있음' : ' 활동 없음'}`}
              >
                {c.day}
              </div>
            </div>
          ),
        )}
      </div>
    </div>
  );
}

/**
 * 이어 읽기 카드 — 가로 레이아웃.
 * 좌: 썸네일(실제 커버 or seeded CoverArt) / 우: 제목·진도·CTA.
 * 진행 중 세션이면 정확한 진도 %를, 최근 연 책이면 "최근 연 책"으로 안내.
 */
export function ContinueCard({
  book,
  stat,
  isInProgress,
}: {
  book: Book;
  stat: BookProgressStat | null;
  isInProgress: boolean;
}) {
  const hasCover = Boolean(book.coverImagePath);
  const pct = stat ? Math.round(stat.progressRatio * 100) : 0;
  const quizDone =
    stat?.quizScore !== null && stat?.quizScore !== undefined;
  const label = !stat
    ? isInProgress
      ? '읽는 중'
      : '최근 연 책'
    : quizDone
      ? `완독 · 퀴즈 ${stat.quizScore}/5`
      : stat.progressRatio >= 1
        ? '완독'
        : stat.progressRatio > 0
          ? `${pct}% 읽음`
          : '읽는 중';
  return (
    <Link
      href={`/book/${book.id}`}
      className="group mt-5 flex items-stretch gap-3 rounded-2xl border-2 border-border/80 bg-background/70 p-2.5 transition-shadow press-scale hover:border-primary/40 hover:shadow-md"
    >
      <div className="relative h-20 w-28 shrink-0 overflow-hidden rounded-xl border border-border/50 bg-muted">
        {hasCover ? (
          <Image
            src={book.coverImagePath!}
            alt={book.title}
            fill
            className="object-cover"
            sizes="96px"
          />
        ) : (
          <CoverArt seed={book.id} title={book.title} />
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col justify-between gap-1 py-0.5">
        <div>
          <p className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-[0.12em] text-primary">
            <BookMarked aria-hidden className="size-3.5" />
            {isInProgress ? '이어 읽기' : '다시 보기'}
          </p>
          <p className="mt-0.5 text-sm font-bold">
            {book.title}
          </p>
        </div>
        {/* stat이 있으면 진도 bar + 라벨 동시 표시. 0%·100%에서도 bar를 보여 위계 유지. */}
        {stat ? (
          <div className="space-y-0.5">
            <Progress value={pct} className="h-1.5 rounded-full" />
            <p className="text-[11px] text-muted-foreground">{label}</p>
          </div>
        ) : (
          <p className="text-[11px] text-muted-foreground">{label}</p>
        )}
      </div>
      <span
        aria-hidden
        className="self-center text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary"
      >
        <ArrowRight className="size-4" />
      </span>
    </Link>
  );
}

export function StatCard({
  label,
  value,
  unit,
  icon,
  tone,
}: {
  label: string;
  value: number | null;
  unit: string;
  icon: ReactNode;
  tone: 'gold' | 'green' | 'blue';
}) {
  const toneClass = {
    gold: 'bg-primary/15 text-primary',
    green: 'bg-[color:var(--level-a1)] text-[color:var(--level-a1-fg)]',
    blue: 'bg-[color:var(--accent)]/15 text-[color:var(--accent)]',
  }[tone];

  return (
    <div className="rounded-2xl border border-border/70 bg-background/70 p-3">
      <div className="flex items-center gap-2">
        <span
          className={cn(
            'inline-flex size-8 items-center justify-center rounded-full',
            toneClass,
          )}
        >
          {icon}
        </span>
        <div className="min-w-0 text-xs font-bold uppercase tracking-[0.08em] text-muted-foreground sm:text-sm">
          {label}
        </div>
      </div>
      <div className="mt-2.5 text-3xl font-extrabold leading-none tabular-nums sm:text-4xl">
        {value ?? '—'}
        <span className="ml-1 text-sm font-semibold text-muted-foreground sm:text-base">
          {unit}
        </span>
      </div>
    </div>
  );
}
