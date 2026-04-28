'use client';

import { SessionProvider } from 'next-auth/react';

/**
 * Auth.js v5의 useSession() 훅을 클라이언트 컴포넌트에서 쓰려면
 * 루트 layout에 이 Provider가 필요.
 *
 * DB 세션 전략에서는 SessionProvider가 `/api/auth/session` 을 주기적으로 호출해
 * 세션 유효성을 유지(기본 0초 = 페이지 로드 시 1회, visibility 변경 시 refetch).
 */
export function AuthSessionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return <SessionProvider>{children}</SessionProvider>;
}
