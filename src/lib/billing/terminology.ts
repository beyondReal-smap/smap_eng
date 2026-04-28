/**
 * 별(⭐) 크레딧 단위어·문구 중앙 관리.
 *
 * 코드·DB 레벨에서는 영문 `credits`를 쓰되, 사용자 노출 문구는 모두 "별"로 통일.
 * 이 파일을 교체하면 전체 UI 문구가 일괄 치환되도록 설계.
 */

/** 잔액/가격 UI의 카운트 단위어. "별 50개"의 "개". */
export const STAR_UNIT = '개';

/** 포맷터 — 숫자 앞에 "별", 뒤에 단위어. 로케일 구분자 포함. */
export function formatStars(n: number): string {
  return `별 ${n.toLocaleString('ko-KR')}${STAR_UNIT}`;
}

/** UI 노출 핵심 문구. 교체 시 전 화면에 반영. */
export const STAR_COPY = {
  /** 생성 CTA 근처 설명 */
  spendPerBook: '별 1개를 써서 새 동화 한 편을 만들어요',
  /** 잔액 0 표기 */
  balanceEmpty: '별이 모두 사용되었어요',
  /** 400 에러 토스트 */
  insufficient: '별이 부족해요. 별을 충전하고 다시 만들어볼까요?',
  /** 차감 직후 토스트 */
  consumedToast: (remaining: number) =>
    `별 1개를 사용했어요 · 남은 ${formatStars(remaining)}`,
  /** 충전 완료 토스트 */
  purchasedToast: (added: number, balance: number) =>
    `${formatStars(added)} 충전 완료 · 현재 ${formatStars(balance)}`,
} as const;
