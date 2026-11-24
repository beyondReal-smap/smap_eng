// 별 충전 화면 표시 전용 순수 함수(네이티브 12차 "별 꾸러미").
// 상품·가격·별 수는 `src/lib/billing/packages.ts`(STAR_PACKAGES)가 원천 — 여기서는 그림·문구·배지만 고른다.

import type { StarPackage, StarPackId } from '@/lib/billing/packages';

/** 상품 id → 꾸러미 그림(public/images/haru/pack_*.{webp,png}). */
export function packImageBase(id: StarPackId): string {
  return `/images/haru/pack_${id}`;
}

/** 상품 id별 기간 문구 — 별 수로 계산하지 않는다(12차 명세). 모르는 id면 null(문구 생략). */
export function packPeriodCopy(id: string): string | null {
  switch (id) {
    case 'small':
      return '한 권 먼저 만들어 보기';
    case 'medium':
      return '매일 한 권씩 두 달';
    case 'large':
      return '매일 한 권씩 넉 달 넘게';
    default:
      return null;
  }
}

export type PackBadge = 'popular' | 'value';

/**
 * 카드 윗변 배지 — "가장 인기" = 상품의 highlighted, "가장 알뜰" = 1개당 가격이 가장 낮은 상품
 * (인기 상품과 같으면 인기만). 둘 다 서버/상품 데이터에서 계산한다.
 */
export function packBadges(packs: readonly StarPackage[]): Record<string, PackBadge> {
  const out: Record<string, PackBadge> = {};
  for (const p of packs) if (p.highlighted) out[p.id] = 'popular';
  const cheapest = packs.reduce<StarPackage | null>(
    (best, p) => (best === null || p.perStarKrw < best.perStarKrw ? p : best),
    null,
  );
  if (cheapest && !out[cheapest.id] && packs.length > 1) out[cheapest.id] = 'value';
  return out;
}

/** 기본 선택 = 가장 인기 상품, 없으면 첫 상품. 상품이 없으면 null. */
export function defaultPackId(packs: readonly StarPackage[]): StarPackId | null {
  return (packs.find((p) => p.highlighted) ?? packs[0])?.id ?? null;
}
