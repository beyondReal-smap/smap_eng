'use client';

import { ThemeProvider as NextThemesProvider } from 'next-themes';

/**
 * 앱 전역 테마 프로바이더 — light 고정.
 *
 * 설계:
 *   - 다크 모드는 랜딩과의 톤 일관성 유지를 위해 제거(2026-04-24).
 *     랜딩(`apps/landing`)이 `color-scheme: light`로 고정돼 있어, 메인 앱에서
 *     OS 다크를 따라가면 랜딩→앱 전환 시 팔레트가 반전되어 "다른 서비스처럼"
 *     보였다.
 *   - `next-themes`는 제거하지 않고 얇게 유지(다른 곳—예: sonner—이 `useTheme`
 *     를 호출하므로). 대신 `forcedTheme="light"` + `enableSystem={false}`로
 *     OS/유저 선호를 무시하고 항상 light.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="light"
      forcedTheme="light"
      enableSystem={false}
      storageKey="smap-eng.theme"
    >
      {children}
    </NextThemesProvider>
  );
}
