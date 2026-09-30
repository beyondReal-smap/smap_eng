import { llmsFullTxt } from '@/lib/content';
import { textResponse } from '@/lib/seo/text-response';

/**
 * `/llms-full.txt` — 공개 콘텐츠 전체를 한 파일로 합친 판본.
 *
 * llms.txt는 링크만 담은 인덱스라 에이전트가 링크를 다시 여러 번 fetch해야 한다.
 * 컨텍스트에 한 번에 넣고 싶은 클라이언트를 위해 소개·FAQ·요금·샘플 전문을
 * 순서대로 이어 붙인 단일 문서를 함께 제공한다(llms.txt 관행).
 */
export const dynamic = 'force-static';
export const revalidate = 3600;

export function GET(): Response {
  return textResponse(llmsFullTxt());
}
