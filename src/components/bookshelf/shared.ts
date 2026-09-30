// Bookshelf 공유 상수·헬퍼. 본체와 보조 컴포넌트가 공유.

import type { BookProgressStat } from '@/lib/db/queries';
import type { CefrLevel } from '@/lib/db/schema';

export const CEFRS: CefrLevel[] = ['A1', 'A2', 'B1', 'B2'];

export const LEVEL_CLASS: Record<CefrLevel, string> = {
  A1: 'level-a1',
  A2: 'level-a2',
  B1: 'level-b1',
  B2: 'level-b2',
};

/** 끝까지 읽음 — 진행률 100% 또는 완료 시각 기록(iOS BookProgressStat.isFinished와 같다). */
export function isFinished(stat: BookProgressStat | undefined): boolean {
  return Boolean(stat && (stat.progressRatio >= 1 || stat.finishedAtUnix !== null));
}

/** 읽는 중(0% 초과 100% 미만). */
export function isInProgress(stat: BookProgressStat | undefined): boolean {
  return Boolean(stat && !isFinished(stat) && stat.progressRatio > 0);
}

/** 화면 표시용 퍼센트(0~100 정수). */
export function progressPercent(stat: BookProgressStat | undefined): number {
  if (!stat) return 0;
  return Math.round(Math.min(1, Math.max(0, stat.progressRatio)) * 100);
}

/** 스크린 리더 상태 — "읽는 중 50%" / "다 읽음, 별 5개" / "새 책". */
export function bookStatusLabel(stat: BookProgressStat | undefined): string {
  if (!stat) return '새 책';
  if (isFinished(stat)) {
    return stat.quizScore !== null ? `다 읽음, 별 ${stat.quizScore}개` : '다 읽음';
  }
  return isInProgress(stat) ? `읽는 중 ${progressPercent(stat)}%` : '새 책';
}
