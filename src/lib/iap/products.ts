/**
 * iOS IAP 상품 ID → 별 수량 매핑 (Single Source of Truth).
 *
 * App Store Connect에 등록된 Consumable 상품 ID와 동일해야 한다.
 * 가격은 Apple이 책정 — 서버는 별 수량만 신뢰.
 *
 * 웹 토스 결제(`STAR_PACK_IDS`)와는 별도 매핑 — `creditTransactions.packageId`는
 * 토스 패키지만 저장하고, IAP는 `iapTransactions.productId`로 별도 추적.
 */

export const IAP_PRODUCTS: Record<string, { stars: number; label: string }> = {
  'com.smap.harubook.star_small': { stars: 1, label: '별 1개' },
  'com.smap.harubook.star_medium': { stars: 60, label: '별 60개' },
  'com.smap.harubook.star_large': { stars: 130, label: '별 130개' },
} as const;

export type IapProductId = keyof typeof IAP_PRODUCTS;

export function isKnownIapProduct(productId: string): productId is IapProductId {
  return Object.prototype.hasOwnProperty.call(IAP_PRODUCTS, productId);
}

export function starsForIapProduct(productId: string): number | null {
  return isKnownIapProduct(productId) ? IAP_PRODUCTS[productId].stars : null;
}
