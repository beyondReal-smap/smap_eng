import { NextRequest } from 'next/server';
import {
  baseAuth,
  baseHandlers,
  baseSignIn,
  signOut,
} from '@/lib/auth/next-auth-instance';
import { isMobileAuthPath, jsonError } from '@/lib/auth/mobile-shared';
import { resolvePublicOrigin } from '@/lib/auth/public-origin';
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
    const publicReq = withPublicOrigin(req);
    if (!publicReq) return jsonError('untrusted_host', 400);
    return baseHandlers.GET(publicReq);
  },
  async POST(req: NextRequest) {
    if (isMobileAuthPath(req, 'password')) return handleMobilePassword(req);
    if (isMobileAuthPath(req, 'signup')) return handleMobileSignup(req);
    if (isMobileAuthPath(req, 'apple')) return handleMobileApple(req);
    if (isMobileAuthPath(req, 'exchange')) return handleMobileExchange(req);
    if (isMobileAuthPath(req, 'dev-issue')) return handleMobileDevIssue(req);
    const publicReq = withPublicOrigin(req);
    if (!publicReq) return jsonError('untrusted_host', 400);
    return baseHandlers.POST(publicReq);
  },
};

/**
 * Auth.js는 `req.url`의 origin으로 OAuth redirect_uri·redirect baseUrl을 정한다(쿠키 secure
 * 여부는 auth.config.ts `useSecureAuthCookies`로 고정). AUTH_URL로 고정하면 두 도메인 병행 서빙이 깨지고(PKCE 쿠키는 접속한 도메인에만
 * 생긴다), 비우면 Next.js 내부 origin(localhost:5111)이 쓰인다. 그래서 허용 목록으로 검증한
 * 공개 origin으로 바꿔 넘긴다 — next-auth `reqWithEnvURL`과 같은 방식.
 */
function withPublicOrigin(req: NextRequest): NextRequest | null {
  const origin = resolvePublicOrigin(req.headers);
  if (!origin) return null;
  const { pathname, search } = req.nextUrl;
  return new NextRequest(new URL(`${pathname}${search}`, origin), req);
}

export const auth = baseAuth;
export const signIn = baseSignIn;
export { signOut };
