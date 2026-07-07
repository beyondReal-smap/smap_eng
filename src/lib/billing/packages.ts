/**
 * 별 크레딧 패키지 정의 (구 `subscribe/plans.ts` 후계).
 *
 * - 가격은 KRW 정수(원). UI는 `formatKrw`로 포맷.
 * - 3종 가격은 .env.local의 NEXT_PUBLIC_STAR_PACK_*_PRICE_KRW 에서 주입.
 *   NEXT_PUBLIC_ 접두사 필수(빌드 타임 inline). 값 변경 후엔 `pnpm build` 재실행.
 * - 크레딧은 무기한(만료 없음). 가족(users) 단위 합산 잔액.
 */

import { parseEnvNonNegativeInt } from '@/lib/env';

export type StarPackId = 'small' | 'medium' | 'large';

export type StarPackage = {
  id: StarPackId;
  /** 충전되는 별 개수 */
  stars: number;
  /** 판매가 (KRW) */
  priceKrw: number;
  /** 개당 환산 단가 (KRW, 반올림) — "개당 ₩N" 표시용 */
  perStarKrw: number;
  name: string;
  tagline: string;
  features: string[];
  /** 추천 배지 */
  highlighted?: boolean;
  /** CTA 문구 */
  cta: string;
};

/**
 * 패키지 비교표 기능 목록.
 * 열: [package.id] → 각 기능 포함 여부(boolean | string)
 */
export type PackageComparisonFeature = {
  label: string;
  values: Record<StarPackId, boolean | string>;
};

// 가격 정책 (.env.local에서 주입, fallback은 2026-06-15 확정값)
// iOS/Android IAP(App Store Connect·Play Console 책정가)와 동일하게 통일:
//  - small: 1,100원 · 별 1개 (맛보기)
//  - medium: 5,500원 · 별 60개 (추천)
//  - large: 11,000원 · 별 130개
const SMALL_PRICE = parseEnvNonNegativeInt(
  'NEXT_PUBLIC_STAR_PACK_SMALL_PRICE_KRW',
  1_100,
);
const MEDIUM_PRICE = parseEnvNonNegativeInt(
  'NEXT_PUBLIC_STAR_PACK_MEDIUM_PRICE_KRW',
  5_500,
);
const LARGE_PRICE = parseEnvNonNegativeInt(
  'NEXT_PUBLIC_STAR_PACK_LARGE_PRICE_KRW',
  11_000,
);

export const STAR_PACKAGES: StarPackage[] = [
  {
    id: 'small',
    stars: 1,
    priceKrw: SMALL_PRICE,
    perStarKrw: SMALL_PRICE,
    name: '별 1개',
    tagline: '한 편만 맛보기',
    features: [
      '동화 1권 생성 (나이·레벨 맞춤)',
      '문장별 원어민 낭독',
      '한글 해석 · 단어장',
      '완독 후 4지선다 퀴즈 5문항',
      '책장에 영구 보관',
    ],
    cta: '별 1개 담기',
  },
  {
    id: 'medium',
    stars: 60,
    priceKrw: MEDIUM_PRICE,
    perStarKrw: Math.round(MEDIUM_PRICE / 60),
    name: '별 60개 팩',
    tagline: '우리 집 책장을 든든하게',
    features: [
      '동화 60권 생성 (가족 합산)',
      '가족 프로필 2~3명 전환',
      '문장별 낭독 + 한글 해석',
      '단어장 SRS · 퀴즈 · 독서 로그',
      '보호자 모드 · 주간 학습 리포트',
    ],
    highlighted: true,
    cta: '별 60개 담기',
  },
  {
    id: 'large',
    stars: 130,
    priceKrw: LARGE_PRICE,
    perStarKrw: Math.round(LARGE_PRICE / 130),
    name: '별 130개 팩',
    tagline: '1년 내내 쭉~',
    features: [
      '별 60개 팩의 모든 기능',
      '동화 130권 생성',
      '연말 학습 성장 리포트',
      '우선 고객 지원',
      '신기능 우선 체험',
    ],
    cta: '별 130개 담기',
  },
];

export const PACKAGE_COMPARISON: PackageComparisonFeature[] = [
  {
    label: '충전되는 별',
    values: {
      small: '1개',
      medium: '60개',
      large: '130개',
    },
  },
  {
    label: '동화 생성 권수',
    values: {
      small: '1권',
      medium: '60권',
      large: '130권',
    },
  },
  {
    label: '가족 합산 잔액',
    values: { small: true, medium: true, large: true },
  },
  {
    label: '문장별 낭독 · 한글 해석',
    values: { small: true, medium: true, large: true },
  },
  {
    label: '4지선다 퀴즈',
    values: { small: true, medium: true, large: true },
  },
  {
    label: '단어장 · SRS 복습',
    values: { small: '단어장', medium: true, large: true },
  },
  {
    label: '주간 학습 리포트',
    values: { small: false, medium: true, large: true },
  },
  {
    label: '우선 고객 지원',
    values: { small: false, medium: false, large: true },
  },
];

export function getPackage(id: StarPackId): StarPackage {
  const pack = STAR_PACKAGES.find((p) => p.id === id);
  if (!pack) throw new Error(`Unknown star package: ${id}`);
  return pack;
}

export function formatKrw(value: number): string {
  return `₩${value.toLocaleString('ko-KR')}`;
}
