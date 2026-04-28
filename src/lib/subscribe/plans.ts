/**
 * 구독 플랜 정의.
 * 가격은 KRW 정수(원). UI는 toLocaleString으로 포맷.
 *
 * 가격 3종은 .env.local의 NEXT_PUBLIC_SUBSCRIPTION_*_PRICE_KRW 에서 주입.
 * UI에 표시되는 값이므로 NEXT_PUBLIC_ 접두사 필수 — Next.js가 빌드 타임에 inline.
 * 값 변경 후엔 반드시 `pnpm build` 재실행.
 *
 * TODO(billing): 정기결제(billingKey)·외부 PG ID 연동 시 `providerPlanId` 필드를
 *   별도 환경변수로 분리하고 여기서는 public 표시용 데이터만 관리.
 */

import { parseEnvNonNegativeInt } from "@/lib/env";

export type BillingInterval = "one-time" | "monthly" | "yearly";

export type Plan = {
  id: "one-time" | "monthly" | "yearly";
  interval: BillingInterval;
  name: string;
  tagline: string;
  priceKrw: number;
  /** 월환산 금액(표시용, 연간 플랜에만 유효) */
  monthlyEquivalentKrw?: number;
  /** 월간 대비 할인율(%). 연간 플랜에 표시 */
  yearlyDiscountPercent?: number;
  /** 플랜 혜택 목록 */
  features: string[];
  /** 하이라이트(추천) 배지 */
  highlighted?: boolean;
  /** CTA 문구 */
  cta: string;
};

// 가격 정책 (.env.local에서 주입, 기본값은 2026-04-22 확정값)
// - 월간: 9,900원 · 매달 50권 생성
// - 연간: 89,000원 · 매달 50권 생성 · 월 환산 7,417원 (약 25% 할인)
// - 1회 이용권: 1,900원 · 1권 (맛보기)
// 동화 1편당 별 1개 차감(billing/credits.ts의 consumeCredit). 월 한도는 사용하지 않으며,
// 패키지 결제 시 grantCredits로 별을 충전한다.
export const MONTHLY_PRICE = parseEnvNonNegativeInt(
  "NEXT_PUBLIC_SUBSCRIPTION_MONTHLY_PRICE_KRW",
  9_900,
);
export const YEARLY_PRICE = parseEnvNonNegativeInt(
  "NEXT_PUBLIC_SUBSCRIPTION_YEARLY_PRICE_KRW",
  89_000,
);
export const ONE_TIME_PRICE = parseEnvNonNegativeInt(
  "NEXT_PUBLIC_SUBSCRIPTION_ONE_TIME_PRICE_KRW",
  1_900,
);
export const YEARLY_DISCOUNT_PERCENT = Math.round(
  (1 - YEARLY_PRICE / (MONTHLY_PRICE * 12)) * 100,
);

export const PLANS: Plan[] = [
  {
    id: "one-time",
    interval: "one-time",
    name: "1회 이용권",
    tagline: "한 권만 읽어볼게요",
    priceKrw: ONE_TIME_PRICE,
    features: [
      "동화 1권 생성 (나이·레벨 맞춤)",
      "문장별 원어민 낭독",
      "한글 해석 · 단어장",
      "완독 후 4지선다 퀴즈 5문항",
      "책장에 영구 보관",
    ],
    cta: "한 권 구매하기",
  },
  {
    id: "monthly",
    interval: "monthly",
    name: "월간 구독",
    tagline: "매달 50권, 우리 집 책장에",
    priceKrw: MONTHLY_PRICE,
    features: [
      "매달 동화 50권 생성 (가족 합산)",
      "가족 프로필 2~3명 전환",
      "문장별 원어민 낭독 + 한글 해석",
      "퀴즈 · 단어장 플래시카드 · 독서 로그",
      "보호자 모드 · 주간 학습 리포트",
      "언제든 해지 가능",
    ],
    highlighted: true,
    cta: "월간 시작하기",
  },
  {
    id: "yearly",
    interval: "yearly",
    name: "연간 구독",
    tagline: "1년 내내 든든하게",
    priceKrw: YEARLY_PRICE,
    monthlyEquivalentKrw: Math.round(YEARLY_PRICE / 12),
    yearlyDiscountPercent: YEARLY_DISCOUNT_PERCENT,
    features: [
      "월간 플랜의 모든 기능",
      `월간 대비 ${YEARLY_DISCOUNT_PERCENT}% 할인`,
      "연말 학습 성장 리포트",
      "우선 고객 지원",
      "신기능 우선 체험",
    ],
    cta: "연간 시작하기",
  },
];

export function formatKrw(value: number): string {
  return `₩${value.toLocaleString("ko-KR")}`;
}

/**
 * 플랜 비교표 기능 목록.
 * 열: [plan.id] → 각 기능 포함 여부(boolean | string)
 */
export type ComparisonFeature = {
  label: string;
  values: Record<Plan["id"], boolean | string>;
};

export const COMPARISON: ComparisonFeature[] = [
  {
    label: "동화 생성 권수",
    values: {
      "one-time": "1권",
      monthly: "매달 50권",
      yearly: "매달 50권",
    },
  },
  {
    label: "가족 프로필 전환",
    values: { "one-time": false, monthly: true, yearly: true },
  },
  {
    label: "문장별 낭독 · 한글 해석",
    values: { "one-time": true, monthly: true, yearly: true },
  },
  {
    label: "4지선다 퀴즈",
    values: { "one-time": true, monthly: true, yearly: true },
  },
  {
    label: "단어장 · SRS 복습",
    values: { "one-time": false, monthly: true, yearly: true },
  },
  {
    label: "주간 학습 리포트",
    values: { "one-time": false, monthly: true, yearly: true },
  },
  {
    label: "신기능 우선 체험",
    values: { "one-time": false, monthly: false, yearly: true },
  },
];
