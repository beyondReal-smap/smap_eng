'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState, type ReactNode } from 'react';
import { Plus, Sparkle, Star } from 'lucide-react';
import type { BookProgressStat } from '@/lib/db/queries';
import type { Book, CefrLevel } from '@/lib/db/schema';
import { cn } from '@/lib/utils';
import { BookCardMenu } from '../book-card-menu';
import { CoverArt } from '../cover-art';
import {
  CEFRS,
  LEVEL_CLASS,
  bookStatusLabel,
  isFinished,
  isInProgress,
  progressPercent,
} from './shared';

/*
 * 나무 책장(그림책 세계, 시안 r6/shelf.html · iOS Bookcase.swift) 조각들.
 * 치수는 globals.css `.haru-shelf-rows`의 CSS 변수(--book-w/--book-h/--slot-h/--row-h)가 정한다.
 * 선반 판자는 행 높이마다 반복되는 배경이라, 마지막 줄이 덜 차도 판자는 케이스 폭 전체를 가로지른다.
 */

/** 책 표지 모양 — 책등 쪽(왼쪽)은 덜 둥글게, 앞쪽은 더 둥글게. */
const BOOK_SHAPE = 'rounded-l-[4px] rounded-r-[7px]';

/* ---------- 선반 ---------- */

/**
 * 선반 칸 목록 — 한 줄에 폰 3권 · 태블릿 4~5권 · 데스크톱 7~8권(헤더 폭 1160px까지 넓힘).
 * `minRows`만큼은 책이 모자라도 빈 판자를 그린다(첫 실행 "채워 갈 책장").
 */
export function ShelfRows({
  children,
  minRows = 1,
  dimmed = false,
}: {
  children: ReactNode;
  minRows?: number;
  dimmed?: boolean;
}) {
  return (
    <div
      className="haru-shelf-rows -mx-3 px-3"
      style={{ minHeight: `calc(var(--row-h) * ${minRows})` }}
    >
      <ul
        className={cn(
          'grid auto-rows-[var(--row-h)] grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 xl:grid-cols-8',
          dimmed && 'pointer-events-none opacity-40 transition-opacity',
        )}
        aria-hidden={dimmed || undefined}
      >
        {children}
      </ul>
    </div>
  );
}

/** 선반 한 칸 — 위 슬롯에 책(바닥 맞춤), 판자 아래에 제목 2줄. */
export function ShelfSlot({ book, title }: { book: ReactNode; title?: string }) {
  return (
    <li className="flex min-w-0 flex-col items-center">
      <div className="relative flex h-[var(--slot-h)] w-full items-end justify-center">
        {book}
      </div>
      {/* 제목은 책 링크 이름으로 이미 읽히므로 스크린 리더에서 숨긴다(중복 방지). */}
      <p
        aria-hidden
        className="mt-5 line-clamp-2 w-[var(--book-w)] break-words text-center text-[11.5px] font-bold leading-[1.3] text-haru-ink sm:text-xs"
      >
        {title ?? ' '}
      </p>
    </li>
  );
}

/* ---------- 책 ---------- */

/**
 * 선반에 꽂힌 책 한 권 — 카드 없이 표지만, 책등 하이라이트와 그림자로 "책"처럼.
 * 상태 스티커: 읽는 중 = 코랄 책갈피 리본 + 하단 진행 막대, 다 읽음 = 기울어진 금색 별, 새 책 = 기울어진 NEW.
 * 관리 메뉴(삭제·신고·표지)는 표지 오른쪽 아래 작은 버튼 — 책 링크와 분리해 키보드 이동이 겹치지 않게.
 */
export function ShelfBook({
  book,
  stat,
  onChanged,
}: {
  book: Book;
  stat?: BookProgressStat;
  onChanged: () => void;
}) {
  const [failedCover, setFailedCover] = useState<string | null>(null);
  const hasCover = Boolean(book.coverImagePath) && failedCover !== book.coverImagePath;
  const finished = isFinished(stat);
  const reading = isInProgress(stat);
  const pct = progressPercent(stat);

  return (
    <div className="group relative h-[var(--book-h)] w-[var(--book-w)]">
      <Link
        href={`/book/${book.id}`}
        aria-label={`${book.title}, ${book.cefr}, ${bookStatusLabel(stat)}`}
        className={cn(
          'relative block h-full w-full overflow-hidden bg-haru-paper shadow-[0_6px_10px_rgb(46_32_25/0.28)] transition-transform duration-200 hover:-translate-y-1 active:translate-y-0 active:scale-[0.98] focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-ring motion-reduce:transition-none motion-reduce:hover:translate-y-0',
          BOOK_SHAPE,
        )}
      >
        {hasCover ? (
          <Image
            // 표지는 쿠키 인증 동적 라우트(/images/*)라 next/image optimizer가
            // upstream fetch에 쿠키를 전달하지 못해 404가 된다 → 원본 직접 서빙.
            src={book.coverImagePath!}
            alt=""
            onError={() => setFailedCover(book.coverImagePath)}
            fill
            unoptimized
            className="object-cover"
            sizes="112px"
          />
        ) : (
          <CoverArt seed={book.id} title={book.title} />
        )}
        {/* 왼쪽 책등 — 어두운 접힘선에서 밝은 반사로(장식). */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-y-0 left-0 w-[9px] bg-[linear-gradient(90deg,rgb(0_0_0/0.22)_0%,rgb(255_255_255/0.18)_60%,transparent_100%)]"
        />
        {reading ? (
          <span aria-hidden className="absolute inset-x-2 bottom-2 h-1.5 overflow-hidden rounded-full bg-white/70">
            <span className="block h-full rounded-full bg-haru-coral" style={{ width: `${pct}%` }} />
          </span>
        ) : null}
      </Link>

      {/* 스티커 — 장식(상태는 링크 이름이 읽어 준다). */}
      {reading ? (
        <svg
          aria-hidden
          viewBox="0 0 14 40"
          className="pointer-events-none absolute -top-1.5 right-3.5 h-10 w-3.5 fill-haru-coral drop-shadow-[0_2px_1.5px_rgb(46_32_25/0.2)]"
        >
          <path d="M0 0H14V40L7 32.8L0 40Z" />
        </svg>
      ) : !stat ? (
        <span
          aria-hidden
          className="pointer-events-none absolute -right-1.5 top-2.5 rotate-[8deg] rounded-md bg-white px-[7px] py-[3px] text-[11px] font-extrabold leading-none text-[#1e4c66] shadow-[0_2px_2.5px_rgb(46_32_25/0.18)]"
        >
          NEW
        </span>
      ) : null}
      {finished ? (
        <span
          aria-hidden
          className="pointer-events-none absolute -left-2 -top-2 flex size-[34px] -rotate-12 items-center justify-center rounded-full bg-haru-gold shadow-[0_3px_3px_rgb(46_32_25/0.18)]"
        >
          <Star className="size-4 fill-haru-ink text-haru-ink" strokeWidth={2.5} />
        </span>
      ) : null}

      <div className="absolute bottom-3.5 right-1 z-10 opacity-100 transition-opacity [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 [@media(hover:hover)]:group-focus-within:opacity-100">
        <BookCardMenu book={book} onChanged={onChanged} />
      </div>
    </div>
  );
}

/** "새 동화 만들기" 마법 책의 모양 — CreateBookDialog 트리거 안에 그린다. */
export function MagicBookFace() {
  return (
    <>
      <span
        aria-hidden
        className={cn(
          'absolute inset-0 border-[2.5px] border-dashed border-haru-coral bg-[linear-gradient(135deg,var(--haru-paper),var(--haru-coral-soft))]',
          BOOK_SHAPE,
        )}
      />
      <span className="relative flex flex-col items-center gap-1.5 px-1.5">
        <span
          aria-hidden
          className="flex size-11 items-center justify-center rounded-full bg-haru-coral text-haru-on-coral shadow-[0_4px_5px_rgb(245_131_92/0.45)]"
        >
          <Plus className="size-6" strokeWidth={3.5} />
        </span>
        <span className="text-center text-xs font-extrabold leading-tight text-haru-coral-ink">
          새 동화 만들기
        </span>
      </span>
      <Sparkle aria-hidden className="absolute left-2.5 top-3 size-3.5 fill-[#e08a1e] text-[#e08a1e]" />
      <Sparkle aria-hidden className="absolute right-3 top-7 size-2.5 fill-[#e08a1e] text-[#e08a1e]" />
    </>
  );
}

/** 마법 책 트리거 버튼 클래스 — 책과 같은 크기·그림자·눌림. */
export const MAGIC_BOOK_CLASS = cn(
  'relative flex h-[var(--book-h)] w-[var(--book-w)] items-center justify-center shadow-[0_6px_10px_rgb(46_32_25/0.18)] transition-transform duration-200 hover:-translate-y-1 active:translate-y-0 active:scale-[0.98] focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-ring disabled:opacity-60 motion-reduce:transition-none motion-reduce:hover:translate-y-0',
  BOOK_SHAPE,
);

/* ---------- 레벨 탭 ---------- */

/**
 * 책장 위쪽 레벨 탭 — 책갈피처럼 위가 둥근 작은 탭. 선택 = 흰 바탕 + 코랄 잉크 + 코랄 밑줄.
 * 시각 크기는 작게, 터치 영역은 44px.
 */
export function LevelTabs({
  value,
  onChange,
  loading,
}: {
  value: CefrLevel | '';
  onChange: (next: CefrLevel | '') => void;
  loading: boolean;
}) {
  const tabs: Array<{ key: CefrLevel | ''; label: string; a11y: string }> = [
    { key: '', label: '전체', a11y: '전체 레벨' },
    ...CEFRS.map((c) => ({ key: c, label: c, a11y: `${c} 레벨` })),
  ];
  return (
    <div role="group" aria-label="레벨 고르기" className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
      {tabs.map((tab) => {
        const active = value === tab.key;
        return (
          <button
            key={tab.key || 'all'}
            type="button"
            aria-pressed={active}
            aria-label={tab.a11y}
            onClick={() => onChange(active && tab.key !== '' ? '' : tab.key)}
            className="group flex min-h-11 shrink-0 items-center rounded-md focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring"
          >
            <span
              className={cn(
                'relative rounded-b-[4px] rounded-t-[10px] px-2.5 py-[5px] text-[12.5px] font-extrabold leading-none transition-colors',
                active
                  ? 'bg-white text-haru-coral-ink after:absolute after:inset-x-0 after:-bottom-0.5 after:h-0.5 after:rounded-full after:bg-haru-coral'
                  : 'bg-haru-paper/70 text-haru-ink/75 group-hover:bg-haru-paper',
              )}
            >
              {tab.label}
            </span>
          </button>
        );
      })}
      {loading ? (
        <span role="status" className="ml-1 inline-flex items-center">
          <span aria-hidden className="size-4 animate-spin rounded-full border-2 border-haru-ink/25 border-t-haru-ink/70 motion-reduce:animate-none" />
          <span className="sr-only">책을 불러오는 중</span>
        </span>
      ) : null}
    </div>
  );
}

/**
 * 레벨 배지 — 색 + dot/mark 이중 인코딩.
 * globals.css의 `.level-dots[data-level]` 규칙이 레벨별 점/마크를 렌더한다.
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

/* ---------- 케이스·상태 ---------- */

/** 둥근 나무 케이스 — 뒤판 그라데이션 + 5px 나무 테두리 + 그림자. */
export function Bookcase({ children, busy }: { children: ReactNode; busy?: boolean }) {
  return (
    <section
      aria-label="나무 책장"
      aria-busy={busy || undefined}
      className="rounded-[18px] border-[5px] border-haru-wood-front bg-[linear-gradient(180deg,var(--haru-shelf-top),var(--haru-shelf-bottom))] px-3 pb-1 pt-2 shadow-[0_10px_24px_rgb(168_111_63/0.22)]"
    >
      {children}
    </section>
  );
}

/**
 * 책장 자리표시 — 탭 자리 + 판자 두 줄 위 흐린 책.
 * `(app)/loading.tsx`(RSC fallback)와 책장 첫 로드가 같은 모양을 써서 교체될 때 점프가 없다.
 */
export function ShelfSkeleton() {
  return (
    <div aria-hidden>
      <div className="flex min-h-11 items-center gap-1.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <span key={i} className="h-6 w-10 rounded-b-[4px] rounded-t-[10px] bg-haru-paper/50" />
        ))}
      </div>
      <ShelfRows minRows={2}>
        {Array.from({ length: 6 }).map((_, i) => (
          <ShelfSlot
            key={i}
            book={<span className={cn('block h-[var(--book-h)] w-[var(--book-w)] animate-pulse bg-haru-paper/45 motion-reduce:animate-none', BOOK_SHAPE)} />}
          />
        ))}
      </ShelfRows>
    </div>
  );
}
