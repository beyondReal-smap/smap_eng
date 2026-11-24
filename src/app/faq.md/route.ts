import { faqMarkdown } from '@/lib/content';
import { textResponse } from '@/lib/seo/text-response';

/** `/faq.md` — `/faq` 페이지의 마크다운 미러. */
export const dynamic = 'force-static';
export const revalidate = 3600;

export function GET(): Response {
  return textResponse(faqMarkdown(), 'text/markdown');
}
