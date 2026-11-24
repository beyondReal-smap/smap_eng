import { llmsTxt } from '@/lib/content';
import { textResponse } from '@/lib/seo/text-response';

/**
 * `/llms.txt` — AI 에이전트가 사이트 구조를 파악하는 진입 인덱스(llmstxt.org 규격).
 *
 * robots.txt가 "어디를 크롤링해도 되는가"를 말한다면, llms.txt는 "무엇을 읽으면
 * 이 사이트를 이해할 수 있는가"를 말한다. 사람이 읽는 HTML을 헤매지 않고 요약·
 * 마크다운 미러·MCP 엔드포인트로 곧장 안내해 잘못된 요약이 만들어질 여지를 줄인다.
 *
 * 콘텐츠는 `@/lib/content`가 생성하므로 이 파일은 서빙만 한다.
 * 기존 robots.txt/sitemap.xml 라우트와 동일하게 force-static으로 빌드 산출물에 고정.
 */
export const dynamic = 'force-static';
export const revalidate = 3600;

export function GET(): Response {
  return textResponse(llmsTxt());
}
