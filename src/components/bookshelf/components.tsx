'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState, type MouseEvent } from 'react';
import { Check } from 'lucide-react';
import { toast } from 'sonner';
import { Progress } from '@/components/ui/progress';
import { apiFetch } from '@/lib/api-client';
import type { BookProgressStat } from '@/lib/db/queries';
import type { Book, CefrLevel } from '@/lib/db/schema';
import { BookCardMenu } from '../book-card-menu';
import { CoverArt } from '../cover-art';
import { IMAGE_GEN_ENABLED, LEVEL_CLASS } from './shared';

export function RecentCard({
  book,
  stat,
}: {
  book: Book;
  stat?: BookProgressStat;
}) {
  const hasCover = Boolean(book.coverImagePath);
  const pct = stat ? Math.round(stat.progressRatio * 100) : 0;
  const quizDone = stat?.quizScore !== null && stat?.quizScore !== undefined;
  return (
    <Link
      href={`/book/${book.id}`}
      className="group flex w-40 shrink-0 flex-col gap-2 rounded-xl border border-border bg-card p-2 shadow-sm transition-shadow press-scale hover:shadow-md"
    >
      <div className="relative aspect-[4/3] overflow-hidden rounded-lg">
        {hasCover ? (
          <Image
            // 표지는 쿠키 인증 동적 라우트(/images/*)라 next/image optimizer가
            // upstream fetch에 쿠키를 전달하지 못해 404가 된다 → 원본 직접 서빙.
            src={book.coverImagePath!}
            alt={book.title}
            fill
            unoptimized
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="160px"
          />
        ) : (
          <CoverArt seed={book.id} title={book.title} />
        )}
        <LevelBadge
          level={book.cefr}
          size="xs"
          className="absolute left-1.5 top-1.5"
        />
        {quizDone ? (
          <span
            aria-label="퀴즈 완료"
            className="absolute right-1.5 top-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-[color:var(--level-a1)] text-[color:var(--level-a1-fg)] shadow-sm"
          >
            <Check aria-hidden className="h-3 w-3" />
          </span>
        ) : null}
      </div>
      <div className="px-1">
        <p className="text-xs font-semibold leading-snug">
          {book.title}
        </p>
        {stat ? (
          <div className="mt-1.5 space-y-0.5">
            <Progress value={pct} className="h-1 rounded-full" />
            <p className="text-[10px] text-muted-foreground">
              {quizDone ? `퀴즈 ${stat.quizScore}/5` : `${pct}%`}
            </p>
          </div>
        ) : null}
      </div>
    </Link>
  );
}

/* ---------- Book Card ---------- */

export function BookCard({
  book,
  stat,
  onChanged,
}: {
  book: Book;
  stat?: BookProgressStat;
  onChanged: () => void;
}) {
  const hasCover = Boolean(book.coverImagePath);
  const pct = stat ? Math.round(stat.progressRatio * 100) : 0;
  const quizDone = stat?.quizScore !== null && stat?.quizScore !== undefined;
  const progressLabel = !stat
    ? null
    : quizDone
      ? `완독 · 퀴즈 ${stat.quizScore}/5`
      : stat.progressRatio >= 1
        ? '완독'
        : stat.progressRatio > 0
          ? `${pct}% 읽음`
          : null;
  // tilt-3d는 "모든 카드가 움직이는 과잉 마이크로인터랙션"으로 지목되어 제거됨.
  return (
    <article className="stagger-item group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-shadow press-scale hover:shadow-md">
      <Link
        href={`/book/${book.id}`}
        className="flex flex-1 flex-col focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {/* Cover */}
        <div className="relative aspect-[5/3] w-full overflow-hidden">
          {hasCover ? (
            <Image
              // 인증 동적 라우트라 optimizer 우회(쿠키 미전달 404 방지).
              src={book.coverImagePath!}
              alt={book.title}
              fill
              unoptimized
              className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            />
          ) : (
            <CoverArt seed={book.id} title={book.title} />
          )}
          <LevelBadge level={book.cefr} className="absolute left-3 top-3" />
          {!hasCover && IMAGE_GEN_ENABLED ? (
            <CoverGenButton bookId={book.id} onGenerated={onChanged} />
          ) : null}
        </div>

        {/* Body */}
        <div className="relative flex flex-1 flex-col gap-2 p-4">
          {/* 우상단 ⋯ 메뉴 — 본문 영역 기준. 제목은 pr-9로 여백 확보. */}
          <div className="absolute right-3 top-3 z-10">
            <BookCardMenu book={book} onChanged={onChanged} />
          </div>
          <h3 className="pr-9 text-base font-bold leading-snug group-hover:text-primary">
            {book.title}
          </h3>
          {book.topic ? (
            <p className="text-sm text-muted-foreground">
              {book.topic}
            </p>
          ) : null}
          {/* 진도 — stat이 있을 때만 노출. 퀴즈 완료는 체크 배지 + 점수. */}
          {stat ? (
            <div className="mt-auto space-y-1 pt-2">
              <Progress
                value={pct}
                className="h-1.5 rounded-full"
                aria-label={progressLabel ?? '진도'}
              />
              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                <span className="inline-flex items-center gap-1 font-medium">
                  {quizDone ? (
                    <Check
                      aria-hidden
                      className="h-3 w-3 text-[color:var(--level-a1-fg)]"
                    />
                  ) : null}
                  <span>{progressLabel}</span>
                </span>
                <time>
                  {new Date(book.createdAt).toLocaleDateString('ko-KR')}
                </time>
              </div>
            </div>
          ) : (
            <div className="mt-auto flex items-center justify-between pt-2 text-[11px] text-muted-foreground">
              <span className="font-medium">아직 안 읽음</span>
              <time>
                {new Date(book.createdAt).toLocaleDateString('ko-KR')}
              </time>
            </div>
          )}
        </div>
      </Link>
    </article>
  );
}

export function CoverGenButton({
  bookId,
  onGenerated,
}: {
  bookId: number;
  onGenerated: () => void;
}) {
  const [loading, setLoading] = useState(false);

  async function handle(e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (loading) return;
    setLoading(true);
    toast.info('표지를 그리는 중… (30~60초)');
    try {
      await apiFetch(`/api/image/book/${bookId}/cover`, { method: 'POST' });
      toast.success('표지 완성');
      onGenerated();
    } catch (err) {
      toast.error(`표지 생성 실패: ${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handle}
      disabled={loading}
      aria-label="AI로 표지 그리기"
      className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-md bg-background/90 px-3 py-1.5 text-xs font-semibold text-foreground shadow-sm backdrop-blur press-scale hover:bg-background disabled:opacity-70"
    >
      {loading ? '그리는 중…' : '표지 만들기'}
    </button>
  );
}

/* ---------- Filter helpers ---------- */

export function FilterGroup({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-medium text-muted-foreground">
        {label}
      </span>
      {children}
    </div>
  );
}

export function LevelPill({
  children,
  level,
  active,
  onClick,
}: {
  children: React.ReactNode;
  level?: CefrLevel;
  active: boolean;
  onClick: () => void;
}) {
  const lvlClass = level ? LEVEL_CLASS[level] : '';
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`relative rounded px-3 py-1 text-xs font-semibold transition ${
        active
          ? `${lvlClass || 'bg-primary text-primary-foreground'} shadow-sm`
          : 'text-muted-foreground hover:bg-muted'
      }`}
    >
      {children}
    </button>
  );
}

/**
 * 레벨 배지 — 색 + dot/mark 이중 인코딩.
 * globals.css의 `.level-dots[data-level]` 규칙이 레벨별 점/마크를 렌더한다.
 * 색맹·동일 화면에 여러 레벨 공존 시 혼동 방지.
 */
export function LevelBadge({
  level,
  size = 'sm',
  className,
}: {
  level: CefrLevel;
  size?: 'xs' | 'sm';
  className?: string;
}) {
  const pad = size === 'xs' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-xs';
  return (
    <span
      className={`${LEVEL_CLASS[level]} ${pad} inline-flex items-center rounded-full font-bold shadow-sm ${className ?? ''}`}
    >
      {level}
      <span className="level-dots" data-level={level} aria-hidden />
    </span>
  );
}

/* ---------- States ---------- */

/**
 * 책장 그리드 placeholder.
 * Bookshelf 자체 fetch loading 상태와 `app/loading.tsx`(RSC fallback) 양쪽에서
 * 동일하게 쓰이도록 export. 두 곳에서 모양이 다르면 RSC 도착 직전에 placeholder가
 * 한 번 더 점프하는 인상을 주어 "스플래시 두 번" 피드백이 발생했었다(2026-04-26).
 */
export function SkeletonGrid() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="overflow-hidden rounded-2xl border border-border/60 bg-card"
        >
          <div className="shimmer aspect-[5/3] w-full" />
          <div className="space-y-2 p-4">
            <div className="shimmer h-4 w-3/4 rounded" />
            <div className="shimmer h-3 w-1/2 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}
