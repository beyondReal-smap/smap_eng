import '@/global.css';

import { Platform } from 'react-native';

const ink = '#172133';
const paper = '#FFF8EA';
const paperWarm = '#FFFDF6';
const gold = '#F4A51C';
const goldSoft = '#FFF1C9';
const sky = '#DDF3FF';
const blueInk = '#0076AA';

const lightPalette = {
  text: ink,
  background: paper,
  backgroundElement: paperWarm,
  backgroundSelected: '#FFE7B8',
  textSecondary: '#4B5565',
  border: '#E6D8BF',
  accent: gold,
  accentSoft: goldSoft,
  forest: ink,
  sky,
  skyInk: blueInk,
  goldDeep: '#C46E00',
  paperWarm,
  peach: '#FFE1CC',
  mint: '#DDF6E8',
  success: '#2E7D62',
  warning: '#B7791F',
  danger: '#B91C1C',
} as const;

/**
 * 팔레트 — light 단일 정책 (Phase 3, 2026-04-28).
 *
 * 웹 `theme-provider.tsx`가 `forcedTheme="light"`로 다크를 비활성화한 것과
 * 동일한 정책을 모바일에도 적용한다. `Colors.dark`는 형 구조 호환을 위해
 * `Colors.light`를 가리키는 alias로 유지한다 — `useColorScheme()`이 'dark'를
 * 반환해도 결국 같은 light 팔레트가 그려진다.
 *
 * 근거: 랜딩(apps/landing)/웹 메인이 light 고정이라 모바일 다크 시
 * "다른 서비스처럼" 보이는 톤 분기 회피. 자녀용 동화책 톤(따뜻한 종이) 강화.
 *
 * 다크모드 부활 시: `dark` 별도 객체로 분리하고 use-theme.ts의 분기 유지.
 */
export const Colors = {
  light: lightPalette,
  dark: lightPalette,
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 760;
