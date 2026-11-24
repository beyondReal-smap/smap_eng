import { Star } from 'lucide-react';
import { localDayKey } from '@/lib/weekly-streak';
import { monthLayout, stampTilt } from '@/lib/stats/records';
import { cn } from '@/lib/utils';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

/** 🔥 연속 칩 — 헤더("N일째", 흰 칩) · 도장판("N일째 연속", 코랄 파스텔 칩) 공용. */
export function StreakChip({ streak, variant }: { streak: number; variant: 'header' | 'inline' }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 whitespace-nowrap rounded-full font-extrabold',
        variant === 'header'
          ? 'bg-white/90 px-3 py-[7px] text-sm text-haru-ink shadow-[0_4px_10px_rgb(168_111_63/0.1)]'
          : 'bg-haru-coral-soft px-2.5 py-1 text-[13px] text-haru-coral-ink',
      )}
    >
      <span aria-hidden>🔥</span>
      <span aria-hidden>{variant === 'header' ? `${streak}일째` : `${streak}일째 연속`}</span>
      <span className="sr-only">{streak}일째 연속 학습</span>
    </span>
  );
}

/**
 * "{M}월 칭찬 도장판" — 이번 달 학습한 날마다 코랄 ★ 도장(iOS PraiseStampBoard).
 * 도장은 날짜별로 정해진 각도로 기울여 손으로 찍은 느낌. 30여 칸을 하나씩 읽지 않도록 판 전체를 한 문장으로.
 */
export function StampBoard({
  thisMonth,
  activeDays,
  streak,
}: {
  thisMonth: string;
  activeDays: readonly string[];
  streak: number;
}) {
  const month = monthLayout(thisMonth);
  const active = new Set(activeDays);
  const todayKey = localDayKey(new Date());
  const activeDates = month.cells.flatMap((c) => (c.kind === 'day' && active.has(c.key) ? [c.day] : []));
  const spoken =
    activeDates.length === 0
      ? '아직 도장이 없어요'
      : `${activeDates.length}일 학습${streak >= 2 ? `, ${streak}일째 연속` : ''}: ${activeDates.map((d) => `${d}일`).join(', ')}`;

  return (
    <section aria-labelledby="stamp-board-title" className="space-y-3">
      <div className="flex items-center gap-2 px-1">
        <h2 id="stamp-board-title" className="text-lg font-extrabold tracking-normal text-haru-ink">
          {month.month}월 칭찬 도장판
        </h2>
        {streak >= 2 ? <StreakChip streak={streak} variant="inline" /> : null}
      </div>
      <div className="rounded-[22px] border-2 border-dashed border-[#ebcbb0] bg-haru-paper px-3.5 pb-4 pt-3.5 shadow-[0_8px_20px_rgb(168_111_63/0.12)]">
        <p className="sr-only">{spoken}</p>
        <div aria-hidden className="grid grid-cols-7 gap-1.5">
          {WEEKDAYS.map((w) => (
            <span key={w} className="text-center text-xs font-bold text-haru-muted">{w}</span>
          ))}
          {month.cells.map((cell) => {
            if (cell.kind === 'blank') return <span key={cell.id} className="aspect-square" />;
            const on = active.has(cell.key);
            const isToday = cell.key === todayKey;
            return (
              <span
                key={cell.id}
                className={cn(
                  'relative flex aspect-square items-center justify-center rounded-full',
                  isToday && 'ring-[2.5px] ring-haru-coral ring-offset-1 ring-offset-haru-paper',
                )}
              >
                {on ? (
                  <span
                    className="flex size-full items-center justify-center rounded-full border-2 border-white/55 bg-[radial-gradient(circle_at_35%_30%,#ff9e7a,#e8633d)] shadow-[0_2px_3px_rgb(232_99_61/0.3)]"
                    style={{ transform: `rotate(${stampTilt(cell.day)}deg)` }}
                  >
                    <Star className="size-[42%] max-w-4 fill-white text-white" />
                  </span>
                ) : (
                  <span className="flex size-full items-center justify-center rounded-full bg-[#f4e7d6] text-xs font-bold tabular-nums text-haru-muted">
                    {cell.day}
                  </span>
                )}
              </span>
            );
          })}
        </div>
      </div>
    </section>
  );
}
