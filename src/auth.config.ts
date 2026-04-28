import type { NextAuthConfig } from 'next-auth';
import Google from 'next-auth/providers/google';
import Kakao from 'next-auth/providers/kakao';

/**
 * 운영 URL 매핑(2026-04-26 nginx 통합 이후):
 *   - `/` → 인증 여부에 따라 page.tsx에서 LandingPage(비로그인) / 책장(로그인) 분기 SSR
 *
 * OAuth 콜백 redirect 목적지를 `/`로 두면 page.tsx가 알아서 책장을 그려준다.
 * 과거 `/app` catch-all(5027 → 5029) 매핑은 5027 PM2 제거로 사라졌고, `/app` 라우트
 * 자체가 존재하지 않아 OAuth 직후 404가 발생하던 것을 이 상수로 일원화한다.
 */
const APP_HOME_PATH = '/';

/**
 * Edge 런타임 호환 설정 — proxy.ts(middleware)에서 import.
 * Adapter / DB 세션은 Node.js 런타임 전용이므로 auth.ts에서 추가.
 */
export default {
  providers: [Google, Kakao],
  pages: {
    // 기본 /api/auth/signin 대신 자체 로그인 화면 사용.
    signIn: '/login',
  },
  callbacks: {
    /**
     * OAuth 콜백 후 최종 redirect 결정.
     *
     * NextAuth 기본값:
     *   - relative URL이면 baseUrl + url
     *   - 같은 origin이면 url 그대로
     *   - 외부 URL이면 baseUrl로 fallback
     *
     * 우리 환경에서 baseUrl(`/`)은 랜딩이므로 fallback이 발생하면 책장으로 못 간다.
     * 또한 callbackUrl을 명시적으로 `/`로 보내려는 시도(레거시 코드 / 외부 링크)도
     * 같은 이유로 책장(`/app`)으로 강제 매핑한다.
     */
    redirect({ url, baseUrl }) {
      const isRoot =
        url === baseUrl || url === `${baseUrl}/` || url === '/';
      // APP_HOME_PATH가 '/'이므로 baseUrl과 그대로 결합 — `${baseUrl}/`는 trailing
      // slash 중복을 일으켜 `https://eng.smap.site//` 같은 깨진 URL이 되므로 분기.
      if (isRoot) return APP_HOME_PATH === '/' ? baseUrl : `${baseUrl}${APP_HOME_PATH}`;

      // 내부 relative 경로는 baseUrl과 결합.
      if (url.startsWith('/')) return `${baseUrl}${url}`;

      // 절대 URL이지만 같은 origin이면 그대로 허용.
      try {
        if (new URL(url).origin === baseUrl) return url;
      } catch {
        // 파싱 실패 시 안전하게 책장으로.
      }

      // 외부 origin은 open redirect 방지를 위해 책장으로.
      return APP_HOME_PATH === '/' ? baseUrl : `${baseUrl}${APP_HOME_PATH}`;
    },
    // 세션의 user.id/role을 클라이언트에 노출 (profiles 연결 + 어드민 가드용).
    session({ session, user }) {
      if (session.user && user) {
        session.user.id = user.id;
        // user.role은 DrizzleAdapter가 users 테이블에서 읽어오는 값.
        // 기존 레코드에 role 컬럼이 없거나 기본값이면 'user'로 폴백.
        session.user.role = (user as { role?: 'user' | 'admin' }).role ?? 'user';
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
