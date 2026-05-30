import { createHash, randomBytes } from 'node:crypto';
import { NextResponse } from 'next/server';

// 모바일 OAuth 시작에서 화이트리스트하는 소셜 제공자.
export const MOBILE_AUTH_PROVIDERS = ['google', 'kakao'] as const;
export const MOBILE_EXCHANGE_CODE_TTL_MS = 5 * 60 * 1000;
export const MOBILE_ACCESS_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export type MobileAuthProvider = (typeof MOBILE_AUTH_PROVIDERS)[number];

export function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

export function createRawToken(): string {
  return randomBytes(32).toString('base64url');
}

export function toUnixSeconds(date: Date): number {
  return Math.floor(date.getTime() / 1000);
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function jsonError(error: string, status: number): NextResponse {
  return NextResponse.json({ error }, { status });
}

export function parseMobileProvider(
  raw: string | null,
): MobileAuthProvider | null {
  if (!raw) return null;
  return MOBILE_AUTH_PROVIDERS.includes(raw as MobileAuthProvider)
    ? (raw as MobileAuthProvider)
    : null;
}

export function parseMobileRedirect(raw: string | null): URL | null {
  if (!raw) return null;
  try {
    const url = new URL(raw);
    if (
      url.protocol !== 'smapeng:' ||
      url.hostname !== 'auth' ||
      url.pathname !== '/callback'
    ) {
      return null;
    }
    return url;
  } catch {
    return null;
  }
}

/**
 * PKCE code_challenge 형식 검증 (RFC 7636 §4.2):
 *  - base64url로 인코딩된 SHA-256 결과 → 정확히 43자, [A-Za-z0-9_-] only.
 *
 * 앱이 challenge 미전송 시 null 반환 → 기존 흐름 유지(backwards compatible).
 * 형식 오류 시 undefined 반환 → 400으로 거부.
 */
export function parsePkceChallenge(
  raw: string | null,
): string | null | undefined {
  if (raw === null || raw === '') return null;
  if (!/^[A-Za-z0-9_-]{43}$/.test(raw)) return undefined;
  return raw;
}

export function pkceVerifierMatchesChallenge(
  verifier: string,
  challenge: string,
): boolean {
  if (!/^[A-Za-z0-9_\-.~]{43,128}$/.test(verifier)) return false;
  const computed = createHash('sha256')
    .update(verifier)
    .digest('base64url');
  return computed === challenge;
}

export function appendNoStore(response: NextResponse): NextResponse {
  response.headers.set('cache-control', 'no-store');
  return response;
}

export function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export function renderMobileProviderPicker(
  reqUrl: URL,
  redirect: URL,
): NextResponse {
  const links = MOBILE_AUTH_PROVIDERS.map((provider) => {
    const href = new URL('/api/auth/mobile/start', reqUrl.origin);
    href.searchParams.set('provider', provider);
    href.searchParams.set('redirect', redirect.toString());
    const label = provider === 'google' ? 'Google' : 'Kakao';
    return `<a class="button" href="${escapeHtml(href.toString())}">${label}로 계속하기</a>`;
  }).join('');

  return new NextResponse(
    `<!doctype html>
<html lang="ko">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>SMAP English 모바일 로그인</title>
    <style>
      body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: #fff7e8; color: #1f2933; font-family: ui-sans-serif, system-ui, sans-serif; }
      main { width: min(420px, calc(100vw - 32px)); border: 1px solid #e8d9bd; border-radius: 28px; background: #fff; padding: 28px; box-shadow: 0 18px 60px rgba(31, 41, 51, 0.12); }
      h1 { margin: 0 0 10px; font-size: 28px; line-height: 1.08; }
      p { color: #6b7280; line-height: 1.55; }
      .actions { display: grid; gap: 12px; margin-top: 22px; }
      .button { display: block; border-radius: 16px; background: #1d5b53; color: #fff; padding: 14px 16px; text-align: center; font-weight: 800; text-decoration: none; }
    </style>
  </head>
  <body>
    <main>
      <h1>모바일 앱으로 로그인</h1>
      <p>보호자 계정으로 로그인하면 앱이 자동으로 열리고 안전한 모바일 세션이 저장됩니다.</p>
      <div class="actions">${links}</div>
    </main>
  </body>
</html>`,
    {
      headers: {
        'content-type': 'text/html; charset=utf-8',
        'cache-control': 'no-store',
      },
    },
  );
}

/**
 * 운영 환경에서는 nginx → 랜딩 프록시(:5027) → Next.js 메인 앱(:5029)을 경유한다.
 * Next.js는 `req.url`을 내부 origin(`http://localhost:5029`)으로 보기 때문에,
 * 외부 사용자에게 노출할 URL은 `x-forwarded-host` + `x-forwarded-proto`로 복원해야 한다.
 * 누락 시 reqUrl의 host/proto로 폴백.
 */
export function getPublicOrigin(req: Request, reqUrl: URL): string {
  const forwardedHost = req.headers.get('x-forwarded-host')?.split(',')[0]?.trim();
  const forwardedProto = req.headers.get('x-forwarded-proto')?.split(',')[0]?.trim();
  const host = forwardedHost && forwardedHost.length > 0 ? forwardedHost : reqUrl.host;
  const proto = forwardedProto && forwardedProto.length > 0
    ? forwardedProto
    : reqUrl.protocol.replace(':', '');
  return `${proto}://${host}`;
}

export function isMobileAuthPath(req: Request, pathname: string): boolean {
  return new URL(req.url).pathname === `/api/auth/mobile/${pathname}`;
}
