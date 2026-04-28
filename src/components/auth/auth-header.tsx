import { AppHeader } from '@/components/app-header';

/**
 * `/login`·`/signup` 헤더 — 단일 `AppHeader`의 `variant="auth"` alias.
 *
 * 2026-04-26 통합 후, 마크업/스타일은 `AppHeader`가 단일 진실 공급원이다.
 * 우측 CTA의 isLogin 분기는 `AuthHeaderRight`(client component)가 담당한다.
 */
export function AuthHeader() {
  return <AppHeader variant="auth" />;
}
