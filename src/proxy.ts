import { NextResponse } from 'next/server';
import { auth } from '@/auth';

/**
 * Next.js 16의 proxy 파일 (구 middleware.ts의 공식 후속).
 * 서버 레벨 인증 가드 — 로그인 세션이 없으면 /login 으로 리다이렉트.
 *
 * 공식 주의(Next.js 16 docs):
 *  - Proxy는 낙관적 체크용. 각 Server Action / Route Handler 내부에서 `requireUserId()` 재검증 필수.
 *  - Proxy는 기본 Node.js 런타임(v15.5+ stable) — mysql2/DB 세션 조회 가능.
 */
// 공개(비로그인도 접근) 경로. /subscribe/success 등 하위 경로는 exact match 미적용 → 로그인 필수 유지.
// '/' 추가 사유: 랜딩(구 :5027 apps/landing) 통합 후, 루트는 인증 여부에 따라
// page.tsx에서 LandingPage / Bookshelf로 분기 렌더된다. 따라서 비로그인 진입을
// /login으로 튕기지 않고 통과시켜야 한다.
// '/link'는 유니버설 링크/앱 링크 폴백(스토어 리다이렉트) — 비로그인 접근 필수.
// '/about', '/faq', '/pricing', '/samples'는 AI 검색·크롤러를 겨냥한 공개 콘텐츠
// 페이지(src/app/(public)/)다. 비로그인 방문자와 크롤러가 주 독자이므로 반드시 공개.
const PUBLIC_PATHS = new Set([
  '/',
  '/login',
  '/signup',
  '/subscribe',
  '/mobile',
  '/link',
  '/about',
  '/faq',
  '/pricing',
  '/samples',
]);
// prefix 기반 공개 경로. 전자상거래법 §10이 요구하는 사업자정보·약관 4종은
// 비로그인 사용자(랜딩 푸터 클릭 포함)도 반드시 접근 가능해야 한다. /legal/* 전체를 공개.
// /mobile/* 는 Expo 정적 웹 앱 엔트리다. 실제 API 권한은 Route Handler에서 검증한다.
// /link/* 는 앱 딥링크 네임스페이스의 웹 폴백. 앱 미설치 사용자가 도달하므로 공개.
// /samples/* 는 샘플 동화 상세(공개 콘텐츠). 사용자 소유 책(/book/*)과 달리 정적 데이터다.
const PUBLIC_PREFIXES = ['/legal/', '/mobile/', '/link/', '/samples/'];
// 로그인된 유저가 진입하면 홈으로 돌려보낼 "인증 페이지"만 별도 집합.
// /subscribe는 로그인 유저도 결제/업그레이드 목적으로 자유 접근 가능해야 함.
const AUTH_ONLY_PATHS = new Set(['/login', '/signup']);

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth;

  // 앱 딥링크 폴백(/link*) — 앱 미설치로 브라우저에 떨어진 요청을 OS별 스토어로 307.
  // 페이지(app/link/page.tsx)에서 redirect()하면 root layout(auth() await) 스트리밍이
  // 먼저 시작돼 200 + 클라이언트 리다이렉트(JS 의존)가 되므로 프록시에서 처리한다.
  // 데스크톱·스토어 URL 미설정 시엔 통과 → 페이지가 스토어 링크 UI를 렌더.
  if (pathname === '/link' || pathname.startsWith('/link/')) {
    const ua = req.headers.get('user-agent') ?? '';
    const target = /iPad|iPhone|iPod/.test(ua)
      ? process.env.NEXT_PUBLIC_APP_STORE_URL
      : /Android/.test(ua)
        ? process.env.NEXT_PUBLIC_PLAY_STORE_URL
        : '';
    if (target) return NextResponse.redirect(target);
  }
  const isPublic =
    PUBLIC_PATHS.has(pathname) ||
    PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix));

  // 로그인 상태에서 로그인/회원가입 페이지 접근 → callbackUrl 또는 앱 홈(`/`)으로.
  //
  // 2026-04-26 nginx 통합 이후 `/`는 page.tsx에서 인증 여부 기반으로 LandingPage /
  // 책장을 분기 SSR한다. 과거엔 `/`가 랜딩 전용이라 fallback을 `/app`(catch-all)로
  // 보냈지만, 5027 제거 후 `/app` 라우트가 사라져 fallback이 404가 됐다. 이제는
  // `/`로 보내면 로그인 사용자에겐 곧바로 책장이 SSR되므로 안전.
  if (isLoggedIn && AUTH_ONLY_PATHS.has(pathname)) {
    const raw = req.nextUrl.searchParams.get('callbackUrl');
    // open redirect 방지: `/`로 시작하고 `//`·`/\\`가 아닌 내부 경로만 허용.
    const isInternal =
      typeof raw === 'string' &&
      raw.startsWith('/') &&
      !raw.startsWith('//') &&
      !raw.startsWith('/\\');
    const target = isInternal ? raw : '/';
    return NextResponse.redirect(new URL(target, req.nextUrl));
  }

  // 비공개 경로는 로그인 필수. 비로그인 시 /login?callbackUrl=... 로.
  if (!isLoggedIn && !isPublic) {
    const loginUrl = new URL('/login', req.nextUrl);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }
});

// 정적 파일, Next 내부, API 라우트, PWA 에셋은 보호 대상 제외.
// ⚠️ /api/*는 전체 제외 — Route Handler가 requireUserIdForApi()로 401 JSON을 직접
//    반환해야 한다. 프록시가 /login HTML로 302 리다이렉트하면 fetch 클라이언트는
//    cross-origin 리다이렉트로 인해 CORS 에러를 받고 401을 처리할 수 없다.
// ⚠️ sw.js / manifest.webmanifest / .js / .json은 반드시 제외 — Service Worker가
//    업데이트 check 시 /login HTML을 받으면 SW 교체가 실패하고 구버전 캐시가 영구 고착됨.
// ⚠️ woff/woff2 등 폰트도 제외 — Next.js의 next/font가 빌드 산출물 외 정적 폰트
//    파일을 fetch할 때 인증 리다이렉트로 막히면 CORS 에러가 발생.
// ⚠️ /.well-known/* 제외 — apple-app-site-association은 확장자가 없어 확장자
//    필터를 통과하지 못한다. Apple CDN/Google 검증기가 /login 리다이렉트를 받으면
//    유니버설 링크/앱 링크 검증이 실패한다.
// ⚠️ md 확장자 제외 — /about.md 등 AI 크롤러용 마크다운 미러가 인증 리다이렉트에
//    걸리면 크롤러가 본문 대신 로그인 페이지를 수집한다(/llms.txt는 txt 필터로 커버).
export const config = {
  matcher: [
    '/((?!api/|_next/|\\.well-known/|favicon\\.ico|sitemap\\.xml|robots\\.txt|sw\\.js|manifest\\.webmanifest|.*\\.(?:css|map|png|jpg|jpeg|gif|svg|webp|ico|js|json|txt|md|xml|woff|woff2|ttf|otf|eot|wav|mp3|m4a|ogg|webm|flac|aac)$).*)',
  ],
};
