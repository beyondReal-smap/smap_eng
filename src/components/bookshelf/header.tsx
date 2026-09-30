'use client';

import Link from 'next/link';
import { useState, type ReactNode } from 'react';
import { AlertCircle, Star } from 'lucide-react';
import { Mascot, SpeechBubble, TabHeader } from '@/components/haru';
import { ProfileSwitcher } from '@/components/profile-switcher';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { Book } from '@/lib/db/schema';
import { cn } from '@/lib/utils';
import type { WeeklyStreak } from '@/lib/weekly-streak';
import { greetingCopy, greetingPose, type GreetingSituation } from './greeting';

/* ---------- 헤더(제목 + 칩) ---------- */

/** 헤더 칩 — 🔥 연속일·★ 별 잔액 같은 짧은 값의 흰 반투명 캡슐. 시각 34px, 터치 44px. */
function HeaderChip({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex h-[34px] items-center gap-1 whitespace-nowrap rounded-full bg-white/85 px-[11px] text-[15px] font-bold tabular-nums text-haru-ink shadow-[0_1px_0_rgb(168_111_63/0.12),0_4px_10px_rgb(168_111_63/0.08)] transition-transform group-hover:scale-[1.03] group-active:scale-95 motion-reduce:transition-none">
      {children}
    </span>
  );
}

const CHIP_TARGET =
  'group inline-flex min-h-11 items-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring';

/**
 * 책장 헤더 — "{이름}의 책장"(ExtraBold) + 오른쪽 칩 3개:
 * 🔥 연속일(2일+일 때만, 누르면 이번 주 기록) · ★ 별 잔액(→ 별 충전) · 아바타(→ 프로필 전환).
 */
export function ShelfHeader({
  childName,
  streak,
  balance,
  balanceUnavailable,
}: {
  childName: string | null;
  streak: WeeklyStreak | null;
  balance: number | null;
  /** 잔액 조회 실패 — "—"가 로딩인지 실패인지 구분되게 경고 아이콘을 붙인다. */
  balanceUnavailable: boolean;
}) {
  const [weekOpen, setWeekOpen] = useState(false);
  const showStreak = streak !== null && streak.streak >= 2;
  const creditLabel =
    balance !== null
      ? `별 ${balance}개, 별 충전 화면으로 이동`
      : balanceUnavailable
        ? '별 잔액을 불러오지 못했어요, 별 충전 화면으로 이동'
        : '별 잔액 불러오는 중, 별 충전 화면으로 이동';

  return (
    <>
      <TabHeader
        title={childName ? `${childName}의 책장` : '책장'}
        trailing={
          <>
            {showStreak ? (
              <button
                type="button"
                className={CHIP_TARGET}
                aria-label={`${streak.streak}일째 연속 학습, 이번 주 기록 보기`}
                onClick={() => setWeekOpen(true)}
              >
                <HeaderChip>
                  <span aria-hidden>🔥</span>
                  {streak.streak}
                </HeaderChip>
              </button>
            ) : null}
            <Link href="/subscribe" className={CHIP_TARGET} aria-label={creditLabel}>
              <HeaderChip>
                <Star aria-hidden className="size-4 fill-[#e08a1e] text-[#e08a1e]" />
                {balance ?? '—'}
                {balance === null && balanceUnavailable ? (
                  <AlertCircle aria-hidden className="size-3.5 text-[#a93318]" />
                ) : null}
              </HeaderChip>
            </Link>
            <ProfileSwitcher variant="avatar" />
          </>
        }
      />

      {streak ? (
        <Dialog open={weekOpen} onOpenChange={setWeekOpen}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>이번 주 기록</DialogTitle>
              <DialogDescription>
                {streak.activeCount > 0
                  ? `이번 주 ${streak.activeCount}일 읽었어요`
                  : '이번 주 첫 책을 읽어 봐요'}
                {streak.streak >= 2 ? ` · 🔥 ${streak.streak}일째 연속` : ''}
              </DialogDescription>
            </DialogHeader>
            <ol className="grid grid-cols-7 gap-1.5" aria-label="이번 주 학습 도장">
              {streak.days.map((day) => (
                <li key={day.key} className="flex flex-col items-center gap-1">
                  <span
                    aria-hidden
                    className={cn(
                      'flex size-9 items-center justify-center rounded-full text-sm font-extrabold',
                      day.isActive
                        ? 'bg-[linear-gradient(135deg,#f79a78,var(--haru-coral))] text-white shadow-[0_3px_6px_rgb(245_131_92/0.35)]'
                        : 'bg-haru-paper text-haru-muted ring-1 ring-haru-line',
                      day.isToday && 'ring-2 ring-haru-coral ring-offset-2 ring-offset-white',
                    )}
                  >
                    {day.isActive ? '★' : ''}
                  </span>
                  <span className="text-xs font-bold text-haru-muted">
                    {day.weekdayLabel}
                    <span className="sr-only">
                      {day.isActive ? ' 읽음' : ' 안 읽음'}
                      {day.isToday ? ', 오늘' : ''}
                    </span>
                  </span>
                </li>
              ))}
            </ol>
          </DialogContent>
        </Dialog>
      ) : null}
    </>
  );
}

/* ---------- 인사 줄 ---------- */

/**
 * 곰(112) + 흰 말풍선. 첫 줄 본문색, 둘째 줄 코랄 잉크.
 * 이어 읽을 책이 있으면 말풍선이 그 책으로 가는 링크가 된다(리더가 읽던 쪽을 기억한다).
 * 책장을 불러오는 중에는 말풍선을 숨기고 곰만 둔다.
 */
export function GreetingRow({
  situation,
  childName,
  continueBook,
}: {
  situation: GreetingSituation | null;
  childName: string | null;
  continueBook: Book | null;
}) {
  const copy = situation ? greetingCopy(situation, childName) : null;
  const bubble = copy ? (
    <SpeechBubble>
      <p className="text-[17px] font-bold leading-[1.45] sm:text-lg">
        <span className="block text-haru-ink">{copy.firstLine}</span>
        <span className="block text-haru-coral-ink">{copy.secondLine}</span>
      </p>
    </SpeechBubble>
  ) : null;

  return (
    <div className="flex min-h-[124px] items-end gap-0.5 pl-1">
      <Mascot
        pose={greetingPose(situation)}
        size={112}
        className="-mb-1.5 drop-shadow-[0_6px_4px_rgb(168_111_63/0.12)]"
      />
      {bubble ? (
        <div className="mb-10 min-w-0 animate-fade-up motion-reduce:animate-none">
          {situation === 'continueReading' && continueBook ? (
            <Link
              href={`/book/${continueBook.id}`}
              aria-label={`${copy!.firstLine} ${copy!.secondLine} — ${continueBook.title} 이어 읽기`}
              className="block rounded-[20px] transition-transform hover:-translate-y-0.5 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring motion-reduce:transition-none"
            >
              {bubble}
            </Link>
          ) : (
            <div role="status">{bubble}</div>
          )}
        </div>
      ) : null}
    </div>
  );
}
