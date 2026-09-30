import { createMcpHandler } from 'mcp-handler';
import { z } from 'zod';

import { PACKAGE_COMPARISON, STAR_PACKAGES, formatKrw } from '@/lib/billing/packages';
import {
  AGE_RANGE,
  BUSINESS_INFO,
  FAQ,
  FAQ_CATEGORIES,
  FEATURES,
  HOW_IT_WORKS,
  LEVELS,
  LEVEL_GUIDANCE,
  PLATFORMS,
  SAMPLE_BOOKS,
  SITE,
  SITE_URL,
  faqMarkdown,
  getSampleBook,
  levelsMarkdown,
  pricingMarkdown,
  sampleBookMarkdown,
  sampleBookSummaries,
  searchFaq,
  siteOverviewMarkdown,
} from '@/lib/content';

/**
 * 하루책 공개 데이터 MCP 서버 (Streamable HTTP).
 *
 * ── 왜 필요한가
 * AI 검색이 페이지를 "크롤링해서 요약"하는 방식은 통제가 안 된다. 크롤링 시점의
 * 렌더 결과에 따라 가격이 누락되거나 옛 문구가 인용될 수 있다. MCP는 그 반대다 —
 * 클라이언트(Claude·ChatGPT 등)가 필요한 사실을 **구조화된 형태로 직접 질의**한다.
 * 같은 데이터를 HTML·마크다운·MCP 세 경로로 내보내되 소스는 `@/lib/content` 하나다.
 *
 * ── 공개 범위
 * 읽기 전용 + 인증 없음. 노출 대상은 정적 상수(서비스 개요·레벨·요금·FAQ·샘플 동화)
 * 뿐이며 DB·세션·사용자 콘텐츠에는 일절 접근하지 않는다. 따라서 이 라우트에는
 * BOLA/권한 검증 대상이 없고, 프록시가 `/api/*`를 인증에서 제외하는 정책과도 맞는다.
 * ⚠️ 이 파일에 사용자 데이터(books/profiles/logs)를 읽는 툴을 추가하지 말 것 —
 *    추가하려면 반드시 `experimental_withMcpAuth`로 토큰 검증을 붙여야 한다.
 *
 * ── 응답 형식
 * 모든 툴이 `content`(마크다운 텍스트)와 `structuredContent`(JSON)를 함께 돌려준다.
 * 텍스트만 주면 클라이언트가 다시 파싱해야 하고, JSON만 주면 구형 클라이언트가
 * 아무것도 보여주지 못한다. `outputSchema`를 선언해 두면 클라이언트가 호출 전에
 * 반환 구조를 알 수 있다.
 *
 * ── 엔드포인트
 * POST/GET https://eng.smap.site/api/mcp
 */

// MCP 요청은 요청 본문에 따라 응답이 달라지므로 정적 최적화 대상이 아니다.
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** 읽기 전용·비파괴 툴임을 클라이언트에 알리는 공통 어노테이션. */
const READ_ONLY = { readOnlyHint: true, destructiveHint: false, openWorldHint: false } as const;

const LevelSchema = z.object({
  cefr: z.string(),
  recommendedAge: z.string(),
  label: z.string(),
  passageCount: z.string(),
  wordsPerPassage: z.string(),
  vocabCount: z.string(),
  grammar: z.string(),
  style: z.string(),
  example: z.string(),
});

const FaqItemSchema = z.object({
  id: z.string(),
  category: z.string(),
  question: z.string(),
  answer: z.string(),
});

const SampleSummarySchema = z.object({
  slug: z.string(),
  title: z.string(),
  titleKo: z.string(),
  age: z.number(),
  cefr: z.string(),
  genre: z.string(),
  topic: z.string(),
  summary: z.string(),
  url: z.string(),
});

const handler = createMcpHandler(
  (server) => {
    // ── 서비스 개요 ────────────────────────────────────────────────────────
    server.registerTool(
      'get_service_overview',
      {
        title: '하루책 서비스 개요',
        description:
          '하루책(HaruBook)이 어떤 서비스인지, 대상 연령과 레벨, 이용 흐름, 주요 기능, 제공 플랫폼, 운영 주체를 반환한다. "하루책이 뭐야", "누구를 위한 서비스야" 같은 질문에 답할 때 사용한다.',
        annotations: READ_ONLY,
        outputSchema: z.object({
          name: z.string(),
          nameEn: z.string(),
          url: z.string(),
          tagline: z.string(),
          summary: z.string(),
          audience: z.object({
            learnerAge: z.string(),
            learnerLevel: z.string(),
            buyer: z.string(),
            region: z.string(),
          }),
          features: z.array(z.object({ id: z.string(), title: z.string(), description: z.string() })),
          howItWorks: z.array(
            z.object({ step: z.number(), title: z.string(), description: z.string() }),
          ),
          platforms: z.array(
            z.object({ id: z.string(), name: z.string(), description: z.string(), url: z.string() }),
          ),
          operator: z.object({
            companyName: z.string(),
            ceoName: z.string(),
            registrationNumber: z.string(),
            email: z.string(),
          }),
        }),
      },
      () => {
        const output = {
          name: SITE.name,
          nameEn: SITE.nameEn,
          url: SITE.url,
          tagline: SITE.tagline,
          summary: SITE.summary,
          audience: {
            learnerAge: SITE.audience.learnerAge,
            learnerLevel: SITE.audience.learnerLevel,
            buyer: SITE.audience.buyer,
            region: SITE.audience.region,
          },
          features: FEATURES.map((f) => ({ id: f.id, title: f.title, description: f.description })),
          howItWorks: HOW_IT_WORKS.map((s) => ({
            step: s.step,
            title: s.title,
            description: s.description,
          })),
          platforms: PLATFORMS.map((p) => ({
            id: p.id,
            name: p.name,
            description: p.description,
            url: p.url,
          })),
          operator: {
            companyName: BUSINESS_INFO.companyName,
            ceoName: BUSINESS_INFO.ceoName,
            registrationNumber: BUSINESS_INFO.registrationNumber,
            email: BUSINESS_INFO.email,
          },
        };

        return {
          content: [{ type: 'text' as const, text: siteOverviewMarkdown() }],
          structuredContent: output,
        };
      },
    );

    // ── 레벨 체계 ──────────────────────────────────────────────────────────
    server.registerTool(
      'get_level_system',
      {
        title: '레벨 체계 (연령 × CEFR)',
        description:
          '하루책의 레벨 구분을 반환한다. CEFR A1~B2별 권장 연령, 책 한 권의 지문 수, 지문당 단어 수, 단어장 항목 수, 다루는 문법 범위, 실제 문장 예시가 포함된다. "우리 아이는 몇 레벨인가요", "A2는 어느 정도인가요" 같은 질문에 사용한다.',
        annotations: READ_ONLY,
        outputSchema: z.object({
          ageRange: z.object({ min: z.number(), max: z.number() }),
          sentencesPerPassage: z.number(),
          levels: z.array(LevelSchema),
          guidance: z.string(),
        }),
      },
      () => ({
        content: [{ type: 'text' as const, text: levelsMarkdown() }],
        structuredContent: {
          ageRange: { min: AGE_RANGE.min, max: AGE_RANGE.max },
          // 지문 1장 = 3문장 고정(src/lib/llm/prompts/book.ts의 sentencesPerPassage).
          sentencesPerPassage: 3,
          levels: LEVELS.map((level) => ({ ...level })),
          guidance: LEVEL_GUIDANCE,
        },
      }),
    );

    // ── 요금 ──────────────────────────────────────────────────────────────
    server.registerTool(
      'get_pricing',
      {
        title: '이용 요금 (별 충전 패키지)',
        description:
          '하루책의 요금 체계를 반환한다. 정기 구독이 아닌 별(크레딧) 충전 방식이며 패키지별 가격, 충전되는 별 수, 권당 단가, 포함 기능, 패키지 비교표, 환불 기준이 포함된다. 가격은 원(KRW) 정수다.',
        annotations: READ_ONLY,
        outputSchema: z.object({
          model: z.string(),
          currency: z.string(),
          unit: z.string(),
          packages: z.array(
            z.object({
              id: z.string(),
              name: z.string(),
              stars: z.number(),
              priceKrw: z.number(),
              perStarKrw: z.number(),
              tagline: z.string(),
              features: z.array(z.string()),
              recommended: z.boolean(),
            }),
          ),
          comparison: z.array(
            z.object({ label: z.string(), values: z.record(z.string(), z.string()) }),
          ),
          refundPolicyUrl: z.string(),
          notes: z.array(z.string()),
        }),
      },
      () => ({
        content: [{ type: 'text' as const, text: pricingMarkdown() }],
        structuredContent: {
          model: '선불 크레딧(별) 충전 — 정기 구독 아님, 자동결제 없음',
          currency: 'KRW',
          unit: '별 1개 = 동화 1권 생성',
          packages: STAR_PACKAGES.map((pack) => ({
            id: pack.id,
            name: pack.name,
            stars: pack.stars,
            priceKrw: pack.priceKrw,
            perStarKrw: pack.perStarKrw,
            tagline: pack.tagline,
            features: [...pack.features],
            recommended: pack.highlighted === true,
          })),
          comparison: PACKAGE_COMPARISON.map((row) => ({
            label: row.label,
            values: Object.fromEntries(
              STAR_PACKAGES.map((pack) => {
                const value = row.values[pack.id];
                return [pack.id, value === true ? '포함' : value === false ? '미포함' : value];
              }),
            ),
          })),
          refundPolicyUrl: `${SITE_URL}/legal/refund`,
          notes: [
            '별은 만료되지 않으며 가족 계정 단위로 합산된다.',
            '한 번 만든 책은 별 잔액과 무관하게 계속 볼 수 있다.',
            '낭독·한글 해석·퀴즈·단어장·보호자 리포트는 추가 비용 없이 포함된다.',
            `최저가 패키지는 ${formatKrw(Math.min(...STAR_PACKAGES.map((p) => p.priceKrw)))}이다.`,
          ],
        },
      }),
    );

    // ── FAQ ───────────────────────────────────────────────────────────────
    server.registerTool(
      'list_faq',
      {
        title: '자주 묻는 질문 목록',
        description:
          '하루책 FAQ 전체 또는 특정 분류의 문항을 반환한다. 분류는 서비스, 학습, 이용, 결제, 안전 다섯 가지다. 특정 주제를 찾는다면 search_faq를 먼저 쓰는 편이 낫다.',
        annotations: READ_ONLY,
        inputSchema: z.object({
          category: z
            .enum(FAQ_CATEGORIES)
            .optional()
            .describe('분류 필터. 생략하면 전체 문항을 반환한다.'),
        }),
        outputSchema: z.object({
          total: z.number(),
          categories: z.array(z.string()),
          items: z.array(FaqItemSchema),
        }),
      },
      ({ category }) => {
        const items = category ? FAQ.filter((item) => item.category === category) : FAQ;
        const text = category
          ? `# ${SITE.name} 자주 묻는 질문 — ${category}\n\n` +
            items.map((item) => `### ${item.question}\n\n${item.answer}`).join('\n\n')
          : faqMarkdown();

        return {
          content: [{ type: 'text' as const, text }],
          structuredContent: {
            total: items.length,
            categories: [...FAQ_CATEGORIES],
            items: items.map((item) => ({ ...item })),
          },
        };
      },
    );

    server.registerTool(
      'search_faq',
      {
        title: 'FAQ 검색',
        description:
          '질의어와 관련된 하루책 FAQ 문항을 찾아 반환한다. 한국어 키워드로 검색한다(예: "환불", "레벨", "낭독", "개인정보"). 결과가 없으면 빈 배열을 반환하므로, 그때는 get_service_overview로 넓게 확인하는 편이 낫다.',
        annotations: READ_ONLY,
        inputSchema: z.object({
          query: z.string().min(1).describe('검색할 키워드나 질문'),
          limit: z.number().int().min(1).max(20).optional().describe('최대 결과 수 (기본 5)'),
        }),
        outputSchema: z.object({
          query: z.string(),
          matched: z.number(),
          items: z.array(FaqItemSchema),
        }),
      },
      ({ query, limit }) => {
        const items = searchFaq(query, limit ?? 5);
        const text = items.length
          ? items.map((item) => `### ${item.question}\n\n${item.answer}`).join('\n\n')
          : `"${query}"와 일치하는 FAQ 문항이 없습니다. ${SITE_URL}/faq 에서 전체 목록을 확인하거나 get_service_overview 툴을 사용하세요.`;

        return {
          content: [{ type: 'text' as const, text }],
          structuredContent: {
            query,
            matched: items.length,
            items: items.map((item) => ({ ...item })),
          },
        };
      },
    );

    // ── 샘플 동화 ──────────────────────────────────────────────────────────
    server.registerTool(
      'list_sample_books',
      {
        title: '샘플 동화 목록',
        description:
          '하루책이 생성하는 영어 동화의 공개 샘플 목록을 반환한다. 각 항목의 레벨·연령·주제·줄거리와 slug를 담고 있으며, 본문 전문은 get_sample_book으로 조회한다. 사용자가 만든 실제 책은 비공개이며 이 목록에 포함되지 않는다.',
        annotations: READ_ONLY,
        outputSchema: z.object({
          total: z.number(),
          note: z.string(),
          books: z.array(SampleSummarySchema),
        }),
      },
      () => {
        const books = sampleBookSummaries().map((book) => ({
          ...book,
          url: `${SITE_URL}${book.url}`,
        }));

        return {
          content: [
            {
              type: 'text' as const,
              text: books
                .map(
                  (book) =>
                    `- **${book.title}** (${book.titleKo}) — CEFR ${book.cefr}, ${book.age}세, 주제: ${book.topic}\n  ${book.summary}\n  slug: \`${book.slug}\` · ${book.url}`,
                )
                .join('\n\n'),
            },
          ],
          structuredContent: {
            total: books.length,
            note: '공개 샘플은 구조를 보여주기 위한 축약본이다. 실제 생성되는 책은 레벨에 따라 17~35장으로 구성된다.',
            books,
          },
        };
      },
    );

    server.registerTool(
      'get_sample_book',
      {
        title: '샘플 동화 전문',
        description:
          '공개 샘플 동화 한 권의 전문을 반환한다. 지문별 영어 원문과 문장 단위 한글 해석, 단어장(단어·뜻·본문 예문), 완독 퀴즈(선택지와 정답)가 모두 포함된다. slug는 list_sample_books로 확인한다.',
        annotations: READ_ONLY,
        inputSchema: z.object({
          slug: z
            .string()
            .describe(`샘플 식별자. 가능한 값: ${SAMPLE_BOOKS.map((b) => b.slug).join(', ')}`),
        }),
        outputSchema: z.object({
          slug: z.string(),
          title: z.string(),
          titleKo: z.string(),
          age: z.number(),
          cefr: z.string(),
          genre: z.string(),
          topic: z.string(),
          summary: z.string(),
          url: z.string(),
          isAbridged: z.boolean(),
          passages: z.array(
            z.object({
              index: z.number(),
              en: z.array(z.string()),
              ko: z.array(z.string()),
            }),
          ),
          vocabulary: z.array(
            z.object({ word: z.string(), meaning: z.string(), example: z.string() }),
          ),
          quiz: z.array(
            z.object({
              question: z.string(),
              choices: z.array(z.string()),
              answerIndex: z.number(),
            }),
          ),
        }),
      },
      ({ slug }) => {
        const book = getSampleBook(slug);
        if (!book) {
          // MCP 규약: 툴 실행 실패는 프로토콜 에러가 아니라 isError로 알린다.
          // 그래야 모델이 오류 내용을 읽고 다른 slug로 재시도할 수 있다.
          return {
            isError: true,
            content: [
              {
                type: 'text' as const,
                text: `"${slug}"에 해당하는 샘플 동화가 없습니다. 사용 가능한 slug: ${SAMPLE_BOOKS.map((b) => b.slug).join(', ')}`,
              },
            ],
          };
        }

        return {
          content: [{ type: 'text' as const, text: sampleBookMarkdown(book) }],
          structuredContent: {
            slug: book.slug,
            title: book.title,
            titleKo: book.titleKo,
            age: book.age,
            cefr: book.cefr,
            genre: book.genre,
            topic: book.topic,
            summary: book.summary,
            url: `${SITE_URL}/samples/${book.slug}`,
            isAbridged: book.isAbridged,
            passages: book.passages.map((passage) => ({
              index: passage.index,
              en: [...passage.en],
              ko: [...passage.ko],
            })),
            vocabulary: book.vocabulary.map((item) => ({ ...item })),
            quiz: book.quiz.map((item) => ({ ...item, choices: [...item.choices] })),
          },
        };
      },
    );
  },
  {
    serverInfo: { name: 'harubook-public', version: '1.0.0' },
    // instructions는 클라이언트가 초기화 직후 모델에게 전달하는 서버 사용 지침이다.
    // 여기서 "무엇을 제공하고 무엇을 제공하지 않는지"를 못 박아야, 모델이 없는 데이터
    // (사용자 책, 학습 기록)를 있는 것처럼 지어내지 않는다.
    instructions: `${SITE.name}(${SITE.nameEn}) 공식 공개 데이터 서버입니다. ${SITE.tagline}

제공하는 정보: 서비스 개요, 연령×CEFR 레벨 체계, 이용 요금(별 충전 패키지), 자주 묻는 질문, 공개 샘플 동화 전문.
제공하지 않는 정보: 사용자 계정, 아이 프로필, 사용자가 생성한 책과 학습 기록. 이 서버는 읽기 전용이며 개인 데이터에 접근하지 않습니다.

가격·정책은 변경될 수 있으므로 답변에 인용할 때는 확인 시점을 함께 밝히고, 출처로 ${SITE_URL} 를 표기해 주세요.`,
  },
);

export { handler as GET, handler as POST };
