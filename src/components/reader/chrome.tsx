'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { ChevronLeft, ChevronRight, CircleHelp, Loader2, Pause, Play, X } from 'lucide-react';
import { Mascot } from '@/components/haru';
import { cn } from '@/lib/utils';
import { READER_GLASS } from './reader-settings';

/*
 * 그림책 리더의 겉 틀(iOS ReaderView topOverlay·controlBar·FinishCard와 같은 값).
 * 로직은 reader.tsx가 갖고, 여기는 모양과 접근성만 담당한다.
 */

/** 점 대신 "3 / 20" 숫자로 바꾸는 쪽 수 기준(넘침 방지). */
const MAX_DOTS = 12;

/** 상단 유리 버튼 줄 — ✕ 닫기 / 쪽 점 / AA. 표지에서는 닫기만. */
export function ReaderTopBar({
  closeHref,
  pageCount,
  current,
  levelLabel,
  ttsProgress,
  settings,
}: {
  closeHref: string;
  /** null이면 쪽 점·AA를 숨긴다(표지 쪽). */
  pageCount: number | null;
  current: number;
  /** 쪽 점의 접근성 값 — 기존 헤더의 레벨·나이 배지를 대신한다. */
  levelLabel: string;
  /** 모든 쪽 낭독을 미리 만드는 중이면 "3/8" — 다 됐으면 null. */
  ttsProgress: { ready: number; total: number } | null;
  settings: ReactNode;
}) {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between gap-2 px-3 pt-2 sm:px-4">
      <Link
        href={closeHref}
        aria-label="책 닫기"
        className="group pointer-events-auto flex size-11 shrink-0 items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        <span
          className={`flex size-10 items-center justify-center rounded-full text-haru-ink transition-transform group-active:scale-95 motion-reduce:transition-none ${READER_GLASS}`}
        >
          <X aria-hidden className="size-5" strokeWidth={2.8} />
        </span>
      </Link>

      {pageCount !== null ? (
        <>
          <div className="flex min-w-0 flex-col items-center gap-1 pt-0.5">
            <div
              role="img"
              aria-label={`${pageCount}쪽 중 ${current + 1}쪽, ${levelLabel}`}
              className={`flex min-h-10 items-center rounded-full px-3 ${READER_GLASS}`}
            >
              {pageCount <= MAX_DOTS ? (
                <span aria-hidden className="flex items-center gap-[5px]">
                  {Array.from({ length: pageCount }, (_, i) => (
                    <span
                      key={i}
                      className={cn(
                        'h-[7px] rounded-full transition-[width,background-color] duration-300 motion-reduce:transition-none',
                        i === current ? 'w-5 bg-haru-coral' : 'w-[7px] bg-haru-ink/25',
                      )}
                    />
                  ))}
                </span>
              ) : (
                <span aria-hidden className="text-sm font-bold tabular-nums text-haru-ink">
                  {current + 1} / {pageCount}
                </span>
              )}
            </div>
            {ttsProgress ? (
              <span
                className={`rounded-full px-2 py-0.5 text-[11px] font-bold text-haru-ink ${READER_GLASS}`}
                aria-live="polite"
                title="동화의 모든 쪽을 미리 낭독 소리로 만드는 중이에요"
              >
                <span aria-hidden>🎙️ </span>낭독 준비 {ttsProgress.ready}/{ttsProgress.total}
              </span>
            ) : null}
          </div>
          <div className="pointer-events-auto shrink-0">{settings}</div>
        </>
      ) : null}
    </div>
  );
}

/** 컨트롤 바 원형 쪽 넘김 버튼(52). */
function PageTurnButton({
  forward,
  disabled,
  label,
  onClick,
}: {
  forward: boolean;
  disabled: boolean;
  label: string;
  onClick: () => void;
}) {
  const Icon = forward ? ChevronRight : ChevronLeft;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={cn(
        'flex size-[52px] shrink-0 items-center justify-center rounded-full transition-transform active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none',
        disabled
          ? 'bg-muted text-haru-muted/60'
          : 'bg-haru-coral-soft/60 text-haru-coral-ink hover:bg-haru-coral-soft',
      )}
    >
      <Icon aria-hidden className="size-6" strokeWidth={3} />
    </button>
  );
}

/**
 * 하단 떠 있는 컨트롤 바(흰, 반경 36, 높이 72, 그림자): ‹ | ▶ 읽어 주기 | 가 한글 | ›.
 * 마지막 쪽에서는 읽어 주기를 tonal로 낮춘다 — 그 쪽의 주 행동은 완독 카드의 "퀴즈 풀기"다.
 */
export function ReaderControlBar({
  canGoBack,
  backLabel,
  onBack,
  canGoForward,
  forwardLabel,
  onForward,
  listen,
  showKo,
  onToggleKo,
  isLastPage,
}: {
  canGoBack: boolean;
  backLabel: string;
  onBack: () => void;
  canGoForward: boolean;
  forwardLabel: string;
  onForward: () => void;
  /** null이면 낭독이 없는 쪽(레거시 결말) — 버튼을 비활성으로 둔다. */
  listen: { playing: boolean; preparing: boolean; onClick: () => void } | null;
  showKo: boolean;
  onToggleKo: () => void;
  isLastPage: boolean;
}) {
  const playing = listen?.playing ?? false;
  const preparing = listen?.preparing ?? false;
  const listenLabel = playing ? '멈추기' : preparing ? '준비 중' : '읽어 주기';
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 px-3 pb-2 sm:px-4 sm:pb-3">
      <div
        role="toolbar"
        aria-label="읽기 도구"
        className="pointer-events-auto mx-auto flex min-h-[72px] max-w-[560px] items-center gap-2 rounded-[36px] bg-white px-2.5 py-2.5 shadow-[0_8px_28px_rgb(46_32_25/0.14)] sm:gap-2.5"
      >
        <PageTurnButton forward={false} disabled={!canGoBack} label={backLabel} onClick={onBack} />
        <button
          type="button"
          onClick={listen?.onClick}
          disabled={!listen || preparing}
          aria-label={playing ? '읽어 주기 멈추기' : preparing ? '소리 준비 중' : '이 쪽 읽어 주기'}
          className={cn(
            'flex min-h-[52px] min-w-0 flex-1 items-center justify-center gap-1.5 rounded-full px-3 text-base font-extrabold text-haru-on-coral transition-transform active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-60 motion-reduce:transition-none',
            isLastPage
              ? 'border border-haru-coral/25 bg-haru-coral-soft'
              : 'bg-haru-coral shadow-[0_5px_14px_rgb(245_131_92/0.35)]',
          )}
        >
          {preparing ? (
            <Loader2 aria-hidden className="size-4 animate-spin motion-reduce:animate-none" />
          ) : playing ? (
            <Pause aria-hidden className="size-4 fill-current" />
          ) : (
            <Play aria-hidden className="size-4 fill-current" />
          )}
          <span className="truncate">{listenLabel}</span>
        </button>
        <button
          type="button"
          onClick={onToggleKo}
          aria-pressed={showKo}
          aria-label="한글 해석"
          className={cn(
            'flex min-h-[52px] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border-2 px-3.5 text-[15px] font-extrabold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring sm:px-4',
            showKo
              ? 'border-haru-coral/60 bg-haru-coral-soft text-haru-coral-ink'
              : 'border-haru-coral/35 bg-white text-haru-ink',
          )}
        >
          <span aria-hidden>가</span>
          <span>한글</span>
        </button>
        <PageTurnButton forward disabled={!canGoForward} label={forwardLabel} onClick={onForward} />
      </div>
    </div>
  );
}

/** 마지막 쪽 완독 축하 카드 — 곰(cheer) + "끝까지 읽었어요!" + 퀴즈 진입(이 쪽의 주 행동). */
export function FinishCard({ quizHref }: { quizHref: string }) {
  return (
    <section
      aria-labelledby="reader-finish-title"
      className="animate-fade-up rounded-[20px] border border-haru-line bg-white p-5 shadow-[0_4px_12px_rgb(0_0_0/0.05)] motion-reduce:animate-none"
    >
      <div className="flex items-center gap-3">
        <Mascot pose="cheer" size={60} />
        <div className="min-w-0">
          <h2 id="reader-finish-title" className="text-lg font-extrabold tracking-normal text-haru-ink">
            끝까지 읽었어요!
          </h2>
          <p className="text-sm font-bold text-haru-muted">퀴즈를 풀면 별점을 받아요</p>
        </div>
      </div>
      <Link
        href={quizHref}
        className="mt-4 flex min-h-[52px] items-center justify-center gap-2 rounded-2xl bg-haru-coral text-base font-extrabold text-haru-on-coral transition-transform hover:-translate-y-0.5 active:translate-y-0 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none"
      >
        <CircleHelp aria-hidden className="size-5" strokeWidth={2.6} />
        퀴즈 풀기
      </Link>
    </section>
  );
}
