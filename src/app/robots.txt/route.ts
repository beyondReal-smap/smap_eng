// 검색엔진 크롤러 안내. 하루치 캐시 + force-static으로 빌드 산출물에 고정.
// 원본: apps/landing/src/app/robots.txt/route.ts (LP 통합과 함께 메인 앱으로 이전)
export const dynamic = 'force-static';
export const revalidate = 3600;

export function GET(): Response {
  const body = ['User-agent: *', 'Allow: /', 'Sitemap: https://eng.smap.site/sitemap.xml', ''].join(
    '\n',
  );
  return new Response(body, {
    headers: {
      'Cache-Control': 'public, max-age=3600',
      'Content-Type': 'text/plain; charset=utf-8',
    },
  });
}
