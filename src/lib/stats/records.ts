// 통계 "독서 기록"(네이티브 7차) 순수 함수 — iOS StatsViewModel·PraiseStampBoard(MonthInfo)와 같은 규칙.

import type { BookProgressStat } from '@/lib/db/queries';
import type { Book, CefrLevel } from '@/lib/db/schema';

export const CEFR_ORDER: CefrLevel[] = ['A1', 'A2', 'B1', 'B2'];

export interface LevelRow {
  level: CefrLevel;
  /** 그 레벨 책 수. */
  count: number;
  /** 완독 기록이 있는 책 수. */
  finished: number;
}

/** 레벨별 책 수 + 완독 수(모험 길 노드 캡션). */
export function levelRows(
  books: readonly Book[],
  stats: Readonly<Record<number, BookProgressStat>>,
): LevelRow[] {
  return CEFR_ORDER.map((level) => {
    const inLevel = books.filter((b) => b.cefr === level);
    return {
      level,
      count: inLevel.length,
      finished: inLevel.filter((b) => stats[b.id]?.finishedAtUnix != null).length,
    };
  });
}

/**
 * 모험 길 "지금 여기" — 가장 최근에 시작한 책의 레벨. 읽은 기록이 없으면 책이 있는 가장 낮은 레벨.
 * 책이 하나도 없으면 null.
 */
export function currentLevel(
  books: readonly Book[],
  stats: Readonly<Record<number, BookProgressStat>>,
): CefrLevel | null {
  let latest: { level: CefrLevel; at: number } | null = null;
  for (const b of books) {
    const s = stats[b.id];
    if (s && (latest === null || s.startedAtUnix > latest.at)) {
      latest = { level: b.cefr, at: s.startedAtUnix };
    }
  }
  if (latest) return latest.level;
  return CEFR_ORDER.find((level) => books.some((b) => b.cefr === level)) ?? null;
}

export type MonthCell =
  | { kind: 'blank'; id: string }
  | { kind: 'day'; id: string; day: number; key: string };

export interface MonthLayout {
  year: number;
  month: number;
  daysInMonth: number;
  /** 요일 머리 뒤 빈칸 + 1일~말일(일요일 시작). */
  cells: MonthCell[];
}

/** "YYYY-MM" → 달력 배치(일요일 시작). 형식이 틀리면 `now`의 달. */
export function monthLayout(thisMonth: string, now: Date = new Date()): MonthLayout {
  const m = /^(\d{4})-(\d{2})$/.exec(thisMonth);
  const year = m ? Number(m[1]) : now.getFullYear();
  const month = m ? Number(m[2]) : now.getMonth() + 1;
  const daysInMonth = new Date(year, month, 0).getDate();
  const leading = new Date(year, month - 1, 1).getDay();
  const cells: MonthCell[] = [
    ...Array.from({ length: leading }, (_, i) => ({ kind: 'blank' as const, id: `b-${i}` })),
    ...Array.from({ length: daysInMonth }, (_, i) => ({
      kind: 'day' as const,
      id: `d-${i + 1}`,
      day: i + 1,
      key: `${year}-${String(month).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`,
    })),
  ];
  return { year, month, daysInMonth, cells };
}

/** 도장 기울기 — 날짜별로 정해진 −14~14°(다시 그려도 같은 각도). */
export function stampTilt(day: number): number {
  return ((day * 37) % 29) - 14;
}
