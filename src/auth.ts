import { NextRequest } from 'next/server';
import {
  baseAuth,
  baseHandlers,
  baseSignIn,
  signOut,
} from '@/lib/auth/next-auth-instance';
import { isMobileAuthPath } from '@/lib/auth/mobile-shared';
import {
  handleMobileApple,
  handleMobileDevIssue,
  handleMobileExchange,
  handleMobilePassword,
  handleMobileSignup,
  handleMobileStart,
} from '@/lib/auth/mobile-handlers';

/**
 * Auth.js v5 엔트리 + 모바일 커스텀 인증 라우팅.
 *
 * `/api/auth/mobile/*` 경로는 NextAuth 기본 핸들러 대신 전용 핸들러로 분기하고,
 * 그 외 모든 인증 경로는 NextAuth `baseHandlers`로 위임한다. NextAuth 인스턴스 ·
 * 모바일 핸들러 · crypto/PKCE 헬퍼 구현은 `@/lib/auth/*`에 분리되어 있다.
 */
export const handlers = {
  async GET(req: NextRequest) {
    if (isMobileAuthPath(req, 'start')) return handleMobileStart(req);
    return baseHandlers.GET(req);
  },
  async POST(req: NextRequest) {
    if (isMobileAuthPath(req, 'password')) return handleMobilePassword(req);
    if (isMobileAuthPath(req, 'signup')) return handleMobileSignup(req);
    if (isMobileAuthPath(req, 'apple')) return handleMobileApple(req);
    if (isMobileAuthPath(req, 'exchange')) return handleMobileExchange(req);
    if (isMobileAuthPath(req, 'dev-issue')) return handleMobileDevIssue(req);
    return baseHandlers.POST(req);
  },
};

export const auth = baseAuth;
export const signIn = baseSignIn;
export { signOut };
