'use client';

import Image from 'next/image';
import { useState } from 'react';
import type { Book } from '@/lib/db/schema';
import { CoverArt } from '../cover-art';
import { LEVEL_CLASS } from './shared';

/**
 * 리더 표지 쪽 — 책을 처음부터 열 때만 보이는 그림책 첫 장(iOS ReaderCoverPage, 10차).
 * 하늘→크림 배경 + 언덕 위에 −2° 기울어진 표지, 제목(Andika Bold), "[레벨] 주제 · N쪽",
 * "📖 읽기 시작" / "🔊 처음부터 읽어 주기". 쪽 점·진행률·읽기 로그 진도에는 포함되지 않는다(0쪽).
 */
export function ReaderCoverPage({
  book,
  pageCount,
  onStart,
  onListen,
}: {
  book: Book;
  pageCount: number;
  onStart: () => void;
  onListen: () => void;
}) {
  const subtitle = [book.topic?.trim(), `${pageCount}쪽`].filter(Boolean).join(' · ');
  return (
    <div className="absolute inset-0 overflow-y-auto [container-type:size]">
      {/* 배경 — 하늘 → 복숭아 → 종이 + 민트 언덕(장식). */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,#b8d9f0_0%,rgb(247_207_174/0.55)_60%,var(--haru-paper)_100%)]"
      >
        <svg
          viewBox="0 0 400 100"
          preserveAspectRatio="none"
          className="absolute inset-x-0 top-[47%] h-[26%] w-full"
        >
          <defs>
            <linearGradient id="reader-cover-hill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0.35" stopColor="#b6e5d0" stopOpacity="0.85" />
              <stop offset="1" stopColor="#fffaf1" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path
            d="M0 12 Q100 -4 200 10 Q300 24 400 3 L400 100 L0 100 Z"
            fill="url(#reader-cover-hill)"
          />
        </svg>
      </div>

      <div className="relative mx-auto flex min-h-full max-w-[560px] flex-col items-center px-6 pb-6 pt-[4.5rem]">
        <CoverBook book={book} />

        <div className="mt-9 text-center">
          <h1 className="line-clamp-2 break-words font-reading text-[30px] font-bold leading-[1.15] tracking-normal text-haru-ink sm:text-[34px]">
            {book.title}
          </h1>
          <p className="mt-2.5 flex flex-wrap items-center justify-center gap-1.5 text-sm font-bold text-haru-muted">
            <span
              className={`${LEVEL_CLASS[book.cefr]} rounded-full px-2.5 py-0.5 text-[13px] font-extrabold`}
            >
              {book.cefr}
              <span className="sr-only"> 레벨,</span>
            </span>
            <span>{subtitle}</span>
          </p>
        </div>

        <div className="min-h-6 flex-1" />

        <div className="flex w-full max-w-[420px] flex-col items-center gap-2">
          <button
            type="button"
            onClick={onStart}
            className="inline-flex min-h-[62px] w-full items-center justify-center gap-2 rounded-full bg-haru-coral text-lg font-extrabold text-haru-on-coral shadow-[0_10px_24px_rgb(245_131_92/0.4)] transition-transform hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none"
          >
            <span aria-hidden>📖</span>
            읽기 시작
          </button>
          <button
            type="button"
            onClick={onListen}
            aria-label="처음부터 읽어 주기 — 1쪽부터 소리 내어 읽어 줘요"
            className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-4 text-[15px] font-extrabold text-haru-coral-ink hover:bg-white/50 focus-visible:outline-2 focus-visible:outline-ring"
          >
            <span aria-hidden>🔊</span>
            처음부터 읽어 주기
          </button>
        </div>
      </div>
    </div>
  );
}

/** 기울어진 표지 — 책등 하이라이트 + 깊은 그림자로 "손에 든 책" 느낌(장식). 높이는 화면 34%까지(최대 280). */
function CoverBook({ book }: { book: Book }) {
  const [failed, setFailed] = useState<string | null>(null);
  const hasCover = Boolean(book.coverImagePath) && failed !== book.coverImagePath;
  return (
    <div
      aria-hidden
      className="relative aspect-[3/4] h-[min(280px,34cqh)] min-h-[150px] -rotate-2 overflow-hidden rounded-l-[6px] rounded-r-[12px] shadow-[0_20px_40px_rgb(46_32_25/0.35)]"
    >
      {hasCover ? (
        <Image
          // 표지는 쿠키 인증 동적 라우트(/images/*)라 optimizer를 우회해 원본 직접 서빙.
          src={book.coverImagePath!}
          alt=""
          fill
          unoptimized
          sizes="210px"
          className="object-cover"
          onError={() => setFailed(book.coverImagePath)}
        />
      ) : (
        <CoverArt seed={book.id} title={book.title} />
      )}
      <span className="absolute inset-y-0 left-0 w-3.5 bg-[linear-gradient(90deg,rgb(0_0_0/0.25),rgb(255_255_255/0.2),transparent)]" />
    </div>
  );
}
