/**
 * 비-랜딩 경로를 Next 메인 앱(기본 5029)으로 forward 하는 catch-all 프록시.
 * 기존 Astro `[...path].ts` 로직을 그대로 이식했다.
 *
 * - `/` 는 app/page.tsx 의 정적 랜딩이 우선 매칭되므로 이곳에 오지 않는다.
 * - `/app` · `/app/` 은 Next 메인 앱의 루트(`/`)로 경로 재매핑.
 * - 응답 Location 정규화: 메인 앱이 `/` 로 리다이렉트해도 외부에는 `/app` 으로 노출.
 */

import type { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const DEFAULT_NEXT_ORIGIN = 'http://127.0.0.1:5029';
const HOP_BY_HOP_HEADERS = new Set([
  'connection',
  'content-encoding',
  'content-length',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
]);
const BODYLESS_METHODS = new Set(['GET', 'HEAD']);

async function handler(request: NextRequest): Promise<Response> {
  const incomingUrl = new URL(request.url);
  const publicUrl = getPublicUrl(request, incomingUrl);
  const nextOrigin = new URL(process.env.NEXT_ORIGIN ?? DEFAULT_NEXT_ORIGIN);
  const upstreamUrl = new URL(incomingUrl.pathname + incomingUrl.search, nextOrigin);

  if (incomingUrl.pathname === '/app' || incomingUrl.pathname === '/app/') {
    upstreamUrl.pathname = '/';
  }

  const upstreamHeaders = new Headers(request.headers);
  // Next.js Server Actions CSRF 검증은 `origin` 헤더의 host와 `x-forwarded-host`가
  // 정확히 일치해야 통과한다. 일부 nginx 구성에서 Host 헤더에 포트(:5027)가 붙어
  // 오는 반면 브라우저의 Origin에는 포트가 없어 mismatch로 500이 발생했다.
  // 해결: 브라우저가 보낸 Origin이 있으면 그 host를 x-forwarded-host의 진실 기준으로 사용.
  const originHeader = request.headers.get('origin');
  let forwardedHostForUpstream = publicUrl.host;
  if (originHeader) {
    try {
      forwardedHostForUpstream = new URL(originHeader).host;
    } catch {
      /* origin이 URL 형식이 아니면 기존 publicUrl.host 유지 */
    }
  }
  upstreamHeaders.set('x-forwarded-host', forwardedHostForUpstream);
  upstreamHeaders.set('x-forwarded-proto', publicUrl.protocol.replace(':', ''));
  upstreamHeaders.set('x-forwarded-prefix', '');
  upstreamHeaders.delete('host');
  HOP_BY_HOP_HEADERS.forEach((header) => upstreamHeaders.delete(header));

  const init: RequestInit & { duplex?: 'half' } = {
    method: request.method,
    headers: upstreamHeaders,
    body: BODYLESS_METHODS.has(request.method) ? undefined : request.body,
    redirect: 'manual',
  };
  if (!BODYLESS_METHODS.has(request.method)) {
    init.duplex = 'half';
  }

  const upstreamResponse = await fetch(upstreamUrl, init);

  const responseHeaders = new Headers();
  upstreamResponse.headers.forEach((value, key) => {
    if (!HOP_BY_HOP_HEADERS.has(key.toLowerCase())) {
      responseHeaders.set(key, value);
    }
  });

  const location = responseHeaders.get('location');
  if (location) {
    responseHeaders.set('location', normalizeLocation(location, publicUrl, nextOrigin));
  }

  return new Response(upstreamResponse.body, {
    status: upstreamResponse.status,
    statusText: upstreamResponse.statusText,
    headers: responseHeaders,
  });
}

function getPublicUrl(request: Request, fallbackUrl: URL): URL {
  const publicUrl = new URL(fallbackUrl);
  const forwardedHost = request.headers.get('x-forwarded-host');
  const host = forwardedHost ?? request.headers.get('host');
  const forwardedProto = request.headers.get('x-forwarded-proto');

  if (host) {
    publicUrl.host = host;
  }

  if (forwardedProto === 'http' || forwardedProto === 'https') {
    publicUrl.protocol = `${forwardedProto}:`;
  }

  return publicUrl;
}

function normalizeLocation(location: string, incomingUrl: URL, nextOrigin: URL): string {
  if (location.startsWith('/')) {
    return normalizeInternalLocation(location, incomingUrl);
  }

  try {
    const nextLocation = new URL(location);
    if (
      (incomingUrl.pathname === '/app' || incomingUrl.pathname === '/app/') &&
      nextLocation.pathname === '/login' &&
      nextLocation.searchParams.get('callbackUrl') === '/'
    ) {
      return '/login?callbackUrl=%2Fapp';
    }

    const isInternalLocation =
      nextLocation.origin === nextOrigin.origin || nextLocation.host === incomingUrl.host;

    if (isInternalLocation) {
      return normalizeInternalLocation(
        nextLocation.pathname + nextLocation.search + nextLocation.hash,
        incomingUrl,
      );
    }
  } catch {
    // URL 이 아닌 Location 값은 원본 그대로 전달
  }

  return location;
}

function normalizeInternalLocation(location: string, incomingUrl: URL): string {
  const publicUrl = new URL(location, incomingUrl);

  if (publicUrl.pathname === '/') {
    publicUrl.pathname = '/app';
    return publicUrl.pathname + publicUrl.search + publicUrl.hash;
  }

  if (
    (incomingUrl.pathname === '/app' || incomingUrl.pathname === '/app/') &&
    publicUrl.pathname === '/login' &&
    publicUrl.searchParams.get('callbackUrl') === '/'
  ) {
    publicUrl.searchParams.set('callbackUrl', '/app');
    return publicUrl.pathname + publicUrl.search + publicUrl.hash;
  }

  return publicUrl.pathname + publicUrl.search + publicUrl.hash;
}

export {
  handler as GET,
  handler as POST,
  handler as PUT,
  handler as PATCH,
  handler as DELETE,
  handler as HEAD,
  handler as OPTIONS,
};
