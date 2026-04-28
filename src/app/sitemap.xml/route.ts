// 사이트맵. 빌드 시점의 ISO 날짜로 lastmod 고정 (force-static).
// 원본: apps/landing/src/app/sitemap.xml/route.ts (LP 통합과 함께 메인 앱으로 이전)
export const dynamic = 'force-static';
export const revalidate = 3600;

const TODAY = new Date().toISOString().slice(0, 10);

export function GET(): Response {
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://eng.smap.site/</loc>
    <lastmod>${TODAY}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>
`;
  return new Response(body, {
    headers: {
      'Cache-Control': 'public, max-age=3600',
      'Content-Type': 'application/xml; charset=utf-8',
    },
  });
}
