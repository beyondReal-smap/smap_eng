import { samplesMarkdown } from '@/lib/content';
import { textResponse } from '@/lib/seo/text-response';

/**
 * `/samples.md` — 샘플 동화 3권의 본문·해석·단어장·퀴즈 전문을 담은 마크다운.
 *
 * 개별 책의 마크다운 라우트는 두지 않는다. Next.js 동적 세그먼트는 `[slug].md`
 * 형태를 지원하지 않아 URL이 어색해지고, 3권 전체를 합쳐도 한 컨텍스트에 들어가는
 * 분량이다. 개별 조회가 필요한 클라이언트는 MCP `get_sample_book`을 쓰면 된다.
 */
export const dynamic = 'force-static';
export const revalidate = 3600;

export function GET(): Response {
  return textResponse(samplesMarkdown(), 'text/markdown');
}
