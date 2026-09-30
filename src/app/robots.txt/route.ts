// 검색엔진·AI 크롤러 안내. 하루치 캐시 + force-static으로 빌드 산출물에 고정.
// 원본: apps/landing/src/app/robots.txt/route.ts (LP 통합과 함께 메인 앱으로 이전)
import { SITE_URL } from '@/lib/content';

export const dynamic = 'force-static';
export const revalidate = 3600;

/**
 * ⚠️ robots.txt 그룹 규칙: 크롤러는 자신에게 매칭되는 그룹을 **하나만** 따르고,
 * `User-agent: *` 그룹을 상속하지 않는다. 따라서 AI 크롤러를 별도 그룹으로 명시하면
 * Disallow 목록도 그 그룹에 함께 적어야 한다 — 아래처럼 코드로 반복 생성하는 이유다.
 * (그룹마다 손으로 복붙하면 한 곳만 빠져 관리자 페이지가 크롤링되는 사고가 난다.)
 */

/**
 * 크롤링 금지 경로.
 *
 * 인증이 필요한 화면(책장·리더·퀴즈·단어장·보호자 리포트)과 관리자 콘솔, 결제 결과
 * 처리 경로, 앱 딥링크 폴백은 색인 가치가 없거나 노출되면 안 된다. 프록시가 로그인으로
 * 리다이렉트하므로 크롤러에게는 어차피 로그인 페이지 중복 사본으로만 보인다.
 */
const DISALLOW = [
  '/api/',
  '/admin',
  '/book/',
  '/quiz/',
  '/vocab',
  '/stats',
  '/parents',
  '/onboarding',
  '/login',
  '/signup',
  '/subscribe/success',
  '/subscribe/fail',
  '/link',
  '/mobile/',
];

/**
 * 명시적으로 허용하는 경로.
 *
 * `/api/`를 통째로 막았지만 MCP 엔드포인트는 예외다 — robots.txt는 더 긴(구체적인)
 * 규칙이 우선하므로 `/api/mcp`가 `/api/`보다 우선 적용된다. 크롤러가 이 URL을
 * 실제로 크롤링할 일은 없지만, 정책상 열려 있음을 명시해 두는 편이 낫다.
 */
const ALLOW = ['/api/mcp'];

/**
 * 개별 그룹으로 명시할 AI 크롤러.
 *
 * `User-agent: *`로도 이미 허용되지만, 명시적으로 적어 두는 데 두 가지 의미가 있다:
 *  1) 이 사이트가 AI 학습·검색 인용을 **의도적으로 허용**한다는 정책 표명
 *  2) 일부 크롤러는 자기 이름의 그룹이 있을 때만 크롤링 빈도를 높인다
 *
 * 분류:
 *  - 학습(training): GPTBot, ClaudeBot, Google-Extended, Applebot-Extended, CCBot,
 *    meta-externalagent, Amazonbot, cohere-ai — 모델 학습 데이터 수집
 *  - 검색(search): OAI-SearchBot, Claude-SearchBot, PerplexityBot — 생성형 답변의
 *    출처로 쓰기 위한 실시간 색인
 *  - 사용자 트리거(user-triggered): ChatGPT-User, Claude-User, Perplexity-User —
 *    사용자가 "이 링크 읽어줘"라고 했을 때 즉시 방문
 *
 * Google-Extended와 Applebot-Extended는 크롤러가 아니라 이미 수집한 콘텐츠의
 * AI 활용 여부를 제어하는 토큰이다(Googlebot/Applebot 본체와 별개).
 */
const AI_CRAWLERS = [
  'GPTBot',
  'OAI-SearchBot',
  'ChatGPT-User',
  'ClaudeBot',
  'Claude-SearchBot',
  'Claude-User',
  'PerplexityBot',
  'Perplexity-User',
  'Google-Extended',
  'Applebot-Extended',
  'Amazonbot',
  'meta-externalagent',
  'cohere-ai',
  'CCBot',
];

/** 하나의 User-agent 그룹 블록 생성. Allow를 먼저 두어 예외를 눈에 띄게 한다. */
function group(userAgents: string[]): string {
  return [
    ...userAgents.map((agent) => `User-agent: ${agent}`),
    ...ALLOW.map((path) => `Allow: ${path}`),
    ...DISALLOW.map((path) => `Disallow: ${path}`),
  ].join('\n');
}

export function GET(): Response {
  const body = [
    '# 하루책(HaruBook) — https://eng.smap.site',
    '# AI 검색·에이전트 안내: /llms.txt (사이트 인덱스), /llms-full.txt (전체 콘텐츠)',
    '# MCP 서버(읽기 전용, 인증 불필요): /api/mcp',
    '',
    group(['*']),
    '',
    '# --- AI 크롤러 (학습·검색·사용자 트리거) — 크롤링 허용 ---',
    group(AI_CRAWLERS),
    '',
    `Sitemap: ${SITE_URL}/sitemap.xml`,
    '',
  ].join('\n');

  return new Response(body, {
    headers: {
      'Cache-Control': 'public, max-age=3600',
      'Content-Type': 'text/plain; charset=utf-8',
    },
  });
}
