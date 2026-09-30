'use client';

import type { ReactNode } from 'react';
import { ChevronLeft, X } from 'lucide-react';
import { Mascot, SpeechBubble, type MascotPose } from '@/components/haru';
import { DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

/*
 * 새 동화 만들기 상단·하단 공용 부품(14차) — 유리 원 버튼, 단계 점, 곰 + 말풍선, 하단 고정 영역.
 * iOS CreateBookChrome.swift와 같은 값.
 */

/** 흰 반투명 원 버튼(40, 터치 44) — 닫기 ✕ / 이전 ‹. */
export function GlassCircleButton({
  kind,
  label,
  onClick,
}: {
  kind: 'close' | 'back';
  label: string;
  onClick: () => void;
}) {
  const Icon = kind === 'close' ? X : ChevronLeft;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="group flex size-11 shrink-0 items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      <span className="flex size-10 items-center justify-center rounded-full bg-white/85 text-haru-ink shadow-[0_3px_4px_rgb(168_111_63/0.1)] transition-transform group-active:scale-95 motion-reduce:transition-none">
        <Icon aria-hidden className="size-5" strokeWidth={3} />
      </span>
    </button>
  );
}

/** 단계 점 3개 — 지난 단계 = 금색 점, 현재 = 코랄 캡슐(22×8), 남은 단계 = 옅은 나무색 점. */
export function StepDots({ current, total }: { current: number; total: number }) {
  return (
    <div role="img" aria-label={`새 동화 만들기 ${total}단계 중 ${current + 1}단계`} className="flex items-center gap-1.5">
      {Array.from({ length: total }).map((_, i) => (
        <span
          key={i}
          aria-hidden
          className={cn(
            'h-2 rounded-full transition-[width,background-color] duration-200 motion-reduce:transition-none',
            i === current ? 'w-[22px] bg-haru-coral' : 'w-2',
            i < current && 'bg-[#f2c14e]',
            i > current && 'bg-[#e3d2c2]',
          )}
        />
      ))}
    </div>
  );
}

/**
 * 곰 + 말풍선 — 단계 질문을 곰이 대신 묻는다(다이얼로그 제목·설명 역할도 함께).
 * 3단계는 질문 카드가 길어 제목을 한 단계 작게.
 */
export function BearPrompt({
  pose,
  title,
  subtitle,
  mascotSize = 92,
  compact = false,
}: {
  pose: MascotPose;
  title: string;
  subtitle: string;
  mascotSize?: number;
  compact?: boolean;
}) {
  return (
    <div className="flex items-end gap-1">
      <Mascot pose={pose} size={mascotSize} className="-mb-1" />
      <SpeechBubble className="mb-[22px] min-w-0 flex-1">
        <DialogTitle
          className={cn(
            'font-heading font-extrabold leading-snug tracking-normal text-haru-ink',
            compact ? 'text-[19px]' : 'text-[21px]',
          )}
        >
          {title}
        </DialogTitle>
        <DialogDescription className="mt-1 text-[13px] font-bold text-haru-muted">{subtitle}</DialogDescription>
      </SpeechBubble>
    </div>
  );
}

/** 하단 고정 영역 — 위는 투명, 22% 지점부터 벽지색으로 덮어 스크롤 내용이 부드럽게 사라진다. */
export function StepFooter({ children }: { children: ReactNode }) {
  return (
    <div className="shrink-0 space-y-2 bg-[linear-gradient(180deg,transparent,var(--haru-wall)_22%)] px-4 pb-4 pt-3 sm:px-6 sm:pb-5">
      {children}
    </div>
  );
}

/** 코랄 알약 주 버튼(높이 62) — 채움 위 글자는 짙은 잉크. */
export const CORAL_PILL =
  'inline-flex min-h-[62px] w-full items-center justify-center gap-1.5 rounded-full bg-haru-coral px-6 text-lg font-extrabold text-haru-on-coral shadow-[0_10px_20px_rgb(245_131_92/0.35)] transition-transform hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50 disabled:shadow-none motion-reduce:transition-none';
