'use client';

import { SessionProvider } from 'next-auth/react';
import type { Session } from 'next-auth';

/**
 * Auth.js v5의 useSession() 훅을 클라이언트 컴포넌트에서 쓰려면
 * 루트 layout에 이 Provider가 필요.
 *
 * `session` prop으로 server-side `auth()` 결과를 주입하면 SSR HTML부터
 * 인증 상태가 정확히 박힌다. 주입하지 않으면 hydration 후 client가
 * `/api/auth/session`을 fetch할 때까지 status='loading' 상태가 이어지고,
 * AccountMenu 같은 헤더 컴포넌트는 그 사이 비로그인 분기로 그려진다
 * (= "로그인했는데 우상단에 로그인 버튼이 떠"의 근본 원인).
 *
 * DB 세션 전략에서는 SessionProvider가 visibility 변경 시 refetch 한다.
 */
export function AuthSessionProvider({
  session,
  children,
}: {
  session: Session | null;
  children: React.ReactNode;
}) {
  return <SessionProvider session={session}>{children}</SessionProvider>;
}
