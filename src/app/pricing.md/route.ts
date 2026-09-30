import { pricingMarkdown } from '@/lib/content';
import { textResponse } from '@/lib/seo/text-response';

/** `/pricing.md` — `/pricing` 페이지의 마크다운 미러. 가격은 packages.ts가 SSOT. */
export const dynamic = 'force-static';
export const revalidate = 3600;

export function GET(): Response {
  return textResponse(pricingMarkdown(), 'text/markdown');
}
