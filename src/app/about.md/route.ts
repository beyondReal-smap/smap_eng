import { siteOverviewMarkdown } from '@/lib/content';
import { textResponse } from '@/lib/seo/text-response';

/**
 * `/about.md` — `/about` 페이지의 마크다운 미러.
 *
 * HTML 페이지의 `alternates.types['text/markdown']`이 이 URL을 가리킨다.
 * 같은 사실을 같은 소스(`@/lib/content`)에서 렌더하므로 두 표현이 어긋날 수 없다.
 */
export const dynamic = 'force-static';
export const revalidate = 3600;

export function GET(): Response {
  return textResponse(siteOverviewMarkdown(), 'text/markdown');
}
