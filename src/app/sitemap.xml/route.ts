// 사이트맵. 빌드 시점의 ISO 날짜로 lastmod 고정 (force-static).
// 원본: apps/landing/src/app/sitemap.xml/route.ts (LP 통합과 함께 메인 앱으로 이전)
import { PUBLIC_PAGES, SAMPLE_BOOKS, SITE_URL } from '@/lib/content';

export const dynamic = 'force-static';
export const revalidate = 3600;

const TODAY = new Date().toISOString().slice(0, 10);

interface SitemapEntry {
  path: string;
  priority: number;
  changefreq: string;
}

/**
 * 색인 대상 URL 목록.
 *
 * 공개 페이지 목록은 `@/lib/content`의 `PUBLIC_PAGES`가 SSOT이고, 여기에 샘플 동화
 * 상세 URL을 더한다. 마크다운 미러(/about.md 등)와 /llms.txt는 **일부러 제외**한다 —
 * HTML 페이지와 같은 내용이라 중복 색인이 되고, AI 크롤러는 llms.txt를 robots.txt
 * 안내와 링크로 찾아가므로 사이트맵에 넣을 이유가 없다.
 */
const ENTRIES: SitemapEntry[] = [
  ...PUBLIC_PAGES.map((page) => ({
    path: page.path,
    priority: page.priority,
    changefreq: page.changefreq,
  })),
  ...SAMPLE_BOOKS.map((book) => ({
    path: `/samples/${book.slug}`,
    priority: 0.7,
    changefreq: 'monthly',
  })),
];

/**
 * sitemap의 loc는 해당 페이지의 canonical과 **문자 단위로 같아야** 한다.
 * 루트는 `metadataBase` + `canonical: '/'` 조합이 트레일링 슬래시 없는
 * `https://eng.smap.site`로 렌더되므로, 여기서도 슬래시를 붙이지 않는다.
 * (다르면 검색엔진이 sitemap의 URL을 "canonical이 아닌 중복본"으로 취급할 수 있다.)
 */
function absoluteUrl(path: string): string {
  return path === '/' ? SITE_URL : `${SITE_URL}${path}`;
}

export function GET(): Response {
  const urls = ENTRIES.map(
    (entry) => `  <url>
    <loc>${absoluteUrl(entry.path)}</loc>
    <lastmod>${TODAY}</lastmod>
    <changefreq>${entry.changefreq}</changefreq>
    <priority>${entry.priority.toFixed(1)}</priority>
  </url>`,
  ).join('\n');

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;

  return new Response(body, {
    headers: {
      'Cache-Control': 'public, max-age=3600',
      'Content-Type': 'application/xml; charset=utf-8',
    },
  });
}
