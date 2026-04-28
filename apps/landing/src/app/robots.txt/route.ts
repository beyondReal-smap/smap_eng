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
