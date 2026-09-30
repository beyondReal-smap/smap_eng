import { Mascot } from '@/components/haru';
import type { CefrLevel } from '@/lib/db/schema';
import type { LevelRow } from '@/lib/stats/records';
import { cn } from '@/lib/utils';

/*
 * "레벨 모험 길" — 구불구불한 흙길 위 A1→A2→B1→B2 노드(iOS LevelAdventurePath).
 * 좌표는 시안의 361×250 좌표계 — 가로만 카드 폭에 맞춰 늘리고 세로는 그대로.
 * 길은 SVG(non-scaling-stroke로 두께 유지), 노드·곰은 퍼센트 좌표의 HTML.
 */

const HEIGHT = 250;
const NODE = 46;
const MASCOT = 70;
/** 노드 중심(시안 좌표). A1 → B2 순서. */
const CENTERS: Array<[number, number]> = [[41, 193], [147, 135], [241, 93], [321, 47]];
const LEVEL_BG: Record<CefrLevel, string> = {
  A1: '#c8e6c9',
  A2: '#bbdefb',
  B1: '#ffe0b2',
  B2: '#f8bbd0',
};

const pctX = (x: number) => `${(x / 361) * 100}%`;

export function AdventurePath({ rows, current }: { rows: LevelRow[]; current: CefrLevel | null }) {
  const currentIndex = rows.findIndex((r) => r.level === current);
  // 곰은 노드 위(살짝 오른쪽). 위 공간이 모자란 높은 노드(B2)에서는 노드 왼쪽.
  let mascot: { left: string; top: number } | null = null;
  if (currentIndex >= 0 && currentIndex < CENTERS.length) {
    const [x, y] = CENTERS[currentIndex];
    const aboveTop = y - NODE / 2 - MASCOT + 2;
    mascot =
      aboveTop >= 0
        ? { left: `calc(${pctX(x)} + 14px - ${MASCOT / 2}px)`, top: aboveTop }
        : { left: `calc(${pctX(x)} - ${NODE / 2 + MASCOT + 2}px)`, top: Math.max(0, y - MASCOT / 2) };
  }

  return (
    <section aria-labelledby="adventure-title" className="space-y-3">
      <h2 id="adventure-title" className="px-1 text-lg font-extrabold tracking-normal text-haru-ink">레벨 모험 길</h2>
      <div
        className="relative overflow-hidden rounded-[22px] bg-[linear-gradient(180deg,#e6f4e0,#f9ebd2)] shadow-[0_8px_20px_rgb(168_111_63/0.12)]"
        style={{ height: HEIGHT }}
      >
        <svg aria-hidden viewBox="0 0 361 250" preserveAspectRatio="none" className="absolute inset-0 size-full">
          <path
            d="M40 210 C120 210 90 150 170 150 C250 150 250 90 320 60"
            fill="none"
            stroke="#e7cfa8"
            strokeWidth="22"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
          <path
            d="M40 210 C120 210 90 150 170 150 C250 150 250 90 320 60"
            fill="none"
            stroke="#fff"
            strokeWidth="3"
            strokeDasharray="6 8"
            vectorEffect="non-scaling-stroke"
          />
        </svg>

        <ol className="contents">
          {rows.slice(0, CENTERS.length).map((row, i) => {
            const [x, y] = CENTERS[i];
            const isCurrent = i === currentIndex;
            return (
              <li
                key={row.level}
                className={cn('absolute flex flex-col items-center', row.count === 0 && 'opacity-50')}
                style={{ left: `calc(${pctX(x)} - ${NODE / 2}px)`, top: y - NODE / 2, width: NODE }}
              >
                <span className="sr-only">
                  {row.level} 레벨, {row.count}권{row.finished > 0 ? `, 완독 ${row.finished}권` : ''}
                  {isCurrent ? ', 지금 여기' : ''}
                </span>
                <span
                  aria-hidden
                  className={cn(
                    'flex size-[46px] shrink-0 items-center justify-center rounded-full text-[15px] font-extrabold text-haru-ink',
                    // 지금 여기 = 흰 링 4 + 코랄 링 3.
                    isCurrent
                      ? 'shadow-[0_0_0_4px_#fff,0_0_0_7px_var(--haru-coral),0_4px_6px_rgb(168_111_63/0.2)]'
                      : 'shadow-[0_4px_6px_rgb(168_111_63/0.2)]',
                  )}
                  style={{ background: LEVEL_BG[row.level] }}
                >
                  {row.level}
                </span>
                <span aria-hidden className={cn('flex flex-col items-center whitespace-nowrap text-xs font-bold', isCurrent ? 'mt-2' : 'mt-1')}>
                  {isCurrent ? <span className="text-haru-coral-ink">지금 여기!</span> : null}
                  <span className="text-[#5b4636]">
                    {row.finished > 0 ? `${row.count}권 · 완독 ${row.finished}` : `${row.count}권`}
                  </span>
                </span>
              </li>
            );
          })}
        </ol>

        {mascot ? (
          <span className="absolute" style={{ left: mascot.left, top: mascot.top }}>
            <Mascot pose="normal" size={MASCOT} />
          </span>
        ) : null}
      </div>
    </section>
  );
}
