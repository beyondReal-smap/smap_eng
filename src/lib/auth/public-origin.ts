/**
 * 외부 사용자에게 노출할 공개 origin 판정.
 *
 * 운영은 Cloudflare Tunnel → Next.js(:5111)이고, 같은 앱을 두 도메인(eng.smap.site,
 * eng.aiagnt.kr)으로 병행 서빙한다. Next.js의 `req.url`은 내부 origin
 * (`https://localhost:5111`)이므로 OAuth redirect_uri·리다이렉트 URL은 요청 헤더로 복원해야 한다.
 *
 * ⚠️ `x-forwarded-host`는 클라이언트가 보낸 값이 Cloudflare를 그대로 통과한다(실측).
 *    그래서 AUTH_PUBLIC_ORIGINS에 적힌 호스트만 공개 origin으로 인정하고, 목록 밖이면
 *    null을 돌려준다. 호출부는 null을 400으로 거부한다.
 *
 * 헤더 우선순위(`x-forwarded-host` → `host`)는 @auth/core `createActionURL`과 같다.
 * 서버 측 `signIn()`은 원본 헤더 문자열로 직접 URL을 만들기 때문에, 그 경로에서는
 * `resolveSignInOrigin`으로 프로토콜까지 검증해 "검증한 값 = Auth.js가 쓰는 값"을 맞춘다.
 */

const ENV_KEY = 'AUTH_PUBLIC_ORIGINS';

/** `https://a.example,https://b.example` → host(소문자) → origin. 잘못된 항목은 throw. */
export function parsePublicOrigins(raw: string | undefined): Map<string, string> {
  const origins = new Map<string, string>();
  for (const entry of (raw ?? '').split(',')) {
    const trimmed = entry.trim();
    if (!trimmed) continue;
    const url = new URL(trimmed);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') {
      throw new Error(`${ENV_KEY} 항목은 http(s) origin이어야 합니다: ${trimmed}`);
    }
    if (url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
      throw new Error(`${ENV_KEY} 항목에는 경로·계정 정보 없이 origin만 적습니다: ${trimmed}`);
    }
    origins.set(url.host.toLowerCase(), url.origin);
  }
  return origins;
}

/** 요청 헤더의 호스트가 허용 목록에 있으면 그 origin, 없으면 null. */
export function matchPublicOrigin(
  headers: Headers,
  allowed: Map<string, string>,
): string | null {
  const raw = headers.get('x-forwarded-host') ?? headers.get('host');
  // 여러 값(`a, b`)은 통째로 거부한다 — createActionURL은 이 문자열을 그대로 host로 쓴다.
  // 같은 이유로 trim하지 않는다(앞뒤 공백은 Headers가 이미 정리, NBSP 등은 그대로 두어 거부).
  if (!raw || raw.includes(',')) return null;
  return allowed.get(raw.toLowerCase()) ?? null;
}

/**
 * 호스트에 더해 `x-forwarded-proto`까지 공개 origin과 같아야 통과.
 * createActionURL은 `x-forwarded-proto ?? 'https'`로 프로토콜을 정하므로 같은 규칙으로 비교한다.
 * http 방문자는 여기서 거부된다 — 일반 리다이렉트(proxy)는 `matchPublicOrigin`을 써서
 * https 로그인 화면으로 보내 준다.
 */
export function matchSignInOrigin(
  headers: Headers,
  allowed: Map<string, string>,
): string | null {
  const origin = matchPublicOrigin(headers, allowed);
  if (!origin) return null;
  const proto = (headers.get('x-forwarded-proto') ?? 'https').toLowerCase();
  return `${proto}:` === new URL(origin).protocol ? origin : null;
}

let configuredOrigins: Map<string, string> | undefined;

function getConfiguredOrigins(): Map<string, string> {
  if (configuredOrigins) return configuredOrigins;
  // AUTH_URL이 남아 있으면 next-auth가 요청 URL을 그 값으로 덮어써 허용 목록이 무시된다.
  if (process.env.AUTH_URL || process.env.NEXTAUTH_URL) {
    throw new Error(`AUTH_URL/NEXTAUTH_URL과 ${ENV_KEY}는 함께 쓸 수 없습니다. AUTH_URL을 제거하세요.`);
  }
  const origins = parsePublicOrigins(process.env[ENV_KEY]);
  if (origins.size === 0) {
    throw new Error(
      `${ENV_KEY}가 비어 있습니다. 예: ${ENV_KEY}=https://eng.smap.site,https://eng.aiagnt.kr`,
    );
  }
  if (process.env.NODE_ENV === 'production') {
    const insecure = [...origins.values()].filter((o) => !o.startsWith('https://'));
    if (insecure.length > 0) {
      throw new Error(`운영 ${ENV_KEY}에는 https origin만 허용합니다: ${insecure.join(', ')}`);
    }
  }
  configuredOrigins = origins;
  return origins;
}

export function resolvePublicOrigin(headers: Headers): string | null {
  return matchPublicOrigin(headers, getConfiguredOrigins());
}

export function resolveSignInOrigin(headers: Headers): string | null {
  return matchSignInOrigin(headers, getConfiguredOrigins());
}
