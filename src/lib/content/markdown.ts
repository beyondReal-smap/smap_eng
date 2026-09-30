/**
 * 콘텐츠 → 마크다운 직렬화.
 *
 * AI 크롤러·에이전트는 HTML보다 마크다운을 훨씬 정확하게 파싱한다(내비게이션·
 * 스크립트·스타일 노이즈가 없고 제목 계층이 명확하다). 같은 사실을 HTML 페이지와
 * 마크다운 미러 두 형태로 내보내되, **문자열을 두 벌 관리하지 않도록** 렌더링
 * 소스는 `site/levels/faq/sample-books` 모듈 하나로 유지한다.
 *
 * 사용처:
 *  - `/llms.txt`      — 사이트 인덱스(llmstxt.org 규격)
 *  - `/llms-full.txt` — 전체 콘텐츠 단일 파일
 *  - `/about.md` `/faq.md` `/pricing.md` `/samples.md` — 페이지별 미러
 *  - `/api/mcp`       — MCP 툴의 텍스트 응답 본문
 */

import { STAR_PACKAGES, PACKAGE_COMPARISON, formatKrw } from '@/lib/billing/packages';
import { BUSINESS_INFO } from '@/lib/legal/business';
import { FAQ, faqByCategory } from './faq';
import { AGE_RANGE, LEVELS, LEVEL_GUIDANCE } from './levels';
import { SAMPLE_BOOKS, type SampleBook } from './sample-books';
import { FEATURES, HOW_IT_WORKS, PLATFORMS, PUBLIC_PAGES, SITE, SITE_URL } from './site';

/** 문서 하단 공통 출처 표기 — 인용된 조각만 떠돌 때 출처를 되짚을 수 있게 한다. */
function sourceNote(path: string): string {
  return `\n---\n\n출처: ${SITE.name}(${SITE.nameEn}) 공식 사이트 — ${SITE_URL}${path}\n문의: ${BUSINESS_INFO.email}\n`;
}

export function siteOverviewMarkdown(): string {
  const features = FEATURES.map((f) => `### ${f.title}\n\n${f.description}`).join('\n\n');
  const steps = HOW_IT_WORKS.map((s) => `${s.step}. **${s.title}** — ${s.description}`).join('\n');
  const platforms = PLATFORMS.map((p) => `- **${p.name}** — ${p.description} (${p.url})`).join('\n');

  return `# ${SITE.name} (${SITE.nameEn}) 소개

> ${SITE.tagline}

${SITE.summary}

## 대상

- 학습자 연령: ${SITE.audience.learnerAge}
- 영어 레벨: ${SITE.audience.learnerLevel}
- 계정 개설: ${SITE.audience.buyer}
- 서비스 지역: ${SITE.audience.region}
- 인터페이스 언어: ${SITE.languages.ui} / 콘텐츠 언어: ${SITE.languages.content}

## 이용 흐름

${steps}

## 주요 기능

${features}

## 레벨 체계

${levelsMarkdown({ withHeading: false })}

## 제공 플랫폼

${platforms}

## 운영 주체

${BUSINESS_INFO.companyName}(${BUSINESS_INFO.companyNameEn}) · 대표 ${BUSINESS_INFO.ceoName} · 사업자등록번호 ${BUSINESS_INFO.registrationNumber} · 통신판매업신고 ${BUSINESS_INFO.mailOrderRegistration}
${sourceNote('/about')}`;
}

export function levelsMarkdown({ withHeading = true }: { withHeading?: boolean } = {}): string {
  const heading = withHeading ? `# ${SITE.name} 레벨 체계\n\n` : '';
  const rows = LEVELS.map(
    (level) =>
      `| ${level.cefr} | ${level.recommendedAge} | ${level.passageCount} | ${level.wordsPerPassage} | ${level.vocabCount} | ${level.grammar} |`,
  ).join('\n');
  const examples = LEVELS.map(
    (level) => `- **${level.cefr} (${level.recommendedAge})** — ${level.label}\n  - 예시 문장: ${level.example}`,
  ).join('\n');

  return `${heading}책은 연령(${AGE_RANGE.min}~${AGE_RANGE.max}세)과 CEFR 레벨(A1~B2)을 함께 지정해 생성됩니다. 지문(화면) 한 장은 3문장으로 고정됩니다.

| CEFR | 권장 연령 | 지문 수 | 지문당 단어 수 | 단어장 항목 | 문법 범위 |
|---|---|---|---|---|---|
${rows}

${examples}

**레벨 선택 기준** — ${LEVEL_GUIDANCE}`;
}

export function faqMarkdown(): string {
  const body = faqByCategory()
    .map(
      (group) =>
        `## ${group.category}\n\n` +
        group.items.map((item) => `### ${item.question}\n\n${item.answer}`).join('\n\n'),
    )
    .join('\n\n');

  return `# ${SITE.name} 자주 묻는 질문

> ${SITE.tagline}

${body}
${sourceNote('/faq')}`;
}

export function pricingMarkdown(): string {
  const packages = STAR_PACKAGES.map(
    (pack) =>
      `### ${pack.name} — ${formatKrw(pack.priceKrw)}\n\n` +
      `${pack.tagline}. 별 ${pack.stars}개(동화 ${pack.stars}권), 권당 약 ${formatKrw(pack.perStarKrw)}.\n\n` +
      pack.features.map((f) => `- ${f}`).join('\n'),
  ).join('\n\n');

  const comparisonHeader = `| 항목 | ${STAR_PACKAGES.map((p) => p.name).join(' | ')} |`;
  const comparisonDivider = `|---|${STAR_PACKAGES.map(() => '---').join('|')}|`;
  const comparisonRows = PACKAGE_COMPARISON.map((row) => {
    const cells = STAR_PACKAGES.map((pack) => {
      const value = row.values[pack.id];
      if (value === true) return '포함';
      if (value === false) return '미포함';
      return value;
    });
    return `| ${row.label} | ${cells.join(' | ')} |`;
  }).join('\n');

  return `# ${SITE.name} 이용 요금

> 정기 구독이 아니라 필요할 때만 충전하는 별(크레딧) 방식입니다. 자동결제와 해지 절차가 없습니다.

별 1개로 새 동화 한 권을 만들 수 있습니다. 낭독·한글 해석·퀴즈·단어장·보호자 리포트는 추가 비용 없이 포함되며, 한 번 만든 책은 별 잔액과 무관하게 계속 볼 수 있습니다. 별은 만료되지 않고 가족 계정 단위로 합산됩니다.

## 패키지

${packages}

## 패키지 비교

${comparisonHeader}
${comparisonDivider}
${comparisonRows}

## 결제와 환불

웹에서는 카드 결제를 지원하며, iOS·Android 앱에서는 각 스토어의 인앱 결제로 충전합니다.

환불은 결제일로부터 7일 이내이고 별을 사용하지 않았다면 전액, 일부 사용했다면 남은 별의 비율만큼 이루어집니다. 7일이 지난 뒤 남은 별은 결제대행 수수료 등을 공제하고 환불됩니다. 이미 동화 생성에 사용된 별은 외부 AI 호출 비용이 발생했으므로 환불 대상이 아닙니다. 자세한 기준은 ${SITE_URL}/legal/refund 를 참조하세요.
${sourceNote('/pricing')}`;
}

export function sampleBookMarkdown(book: SampleBook): string {
  const passages = book.passages
    .map((passage) => {
      const lines = passage.en
        .map((sentence, i) => `${sentence}\n> ${passage.ko[i] ?? ''}`)
        .join('\n\n');
      return `#### ${passage.index + 1}장\n\n${lines}`;
    })
    .join('\n\n');

  const vocabulary = book.vocabulary
    .map((item) => `| ${item.word} | ${item.meaning} | ${item.example} |`)
    .join('\n');

  const quiz = book.quiz
    .map((item, i) => {
      const choices = item.choices
        .map((choice, ci) => `   ${ci + 1}) ${choice}${ci === item.answerIndex ? ' ✅' : ''}`)
        .join('\n');
      return `${i + 1}. ${item.question}\n${choices}`;
    })
    .join('\n\n');

  return `## ${book.title} (${book.titleKo})

- 레벨: CEFR ${book.cefr} · 권장 연령 ${book.age}세
- 장르: ${book.genre === 'fiction' ? '픽션 동화' : '논픽션 지식책'}
- 주제: ${book.topic}
- 원문 링크: ${SITE_URL}/samples/${book.slug}

${book.summary}

> 이 샘플은 구조를 보여주기 위한 축약본(${book.passages.length}장)입니다. 실제 생성되는 책은 레벨에 따라 17~35장으로 구성됩니다.

### 본문 (영어 원문 / 한글 해석)

${passages}

### 단어장

| 단어 | 뜻 | 본문 예문 |
|---|---|---|
${vocabulary}

### 완독 퀴즈 (정답 표시)

${quiz}`;
}

export function samplesMarkdown(): string {
  const books = SAMPLE_BOOKS.map((book) => sampleBookMarkdown(book)).join('\n\n---\n\n');

  return `# ${SITE.name} 샘플 동화

> ${SITE.name}이 실제로 생성하는 영어 동화의 레벨별 예시입니다. 본문·한글 해석·단어장·퀴즈가 실제 서비스와 동일한 구성으로 제공됩니다.

${books}
${sourceNote('/samples')}`;
}

/**
 * llms.txt — AI 에이전트가 사이트 구조를 한눈에 파악하는 인덱스.
 * 규격: https://llmstxt.org/ (H1 제목 → blockquote 요약 → H2 섹션별 링크 목록)
 */
export function llmsTxt(): string {
  const pageLinks = PUBLIC_PAGES.filter((page) => !page.path.startsWith('/legal'))
    .map((page) => `- [${page.title}](${SITE_URL}${page.path})`)
    .join('\n');

  const markdownLinks = [
    `- [서비스 소개 (마크다운)](${SITE_URL}/about.md): 서비스 개요, 대상, 이용 흐름, 기능, 레벨 체계`,
    `- [자주 묻는 질문 (마크다운)](${SITE_URL}/faq.md): ${FAQ.length}개 문항의 질문과 답변 전문`,
    `- [이용 요금 (마크다운)](${SITE_URL}/pricing.md): 별 패키지 ${STAR_PACKAGES.length}종의 가격과 포함 기능`,
    `- [샘플 동화 (마크다운)](${SITE_URL}/samples.md): 레벨별 샘플 ${SAMPLE_BOOKS.length}권의 본문·해석·단어장·퀴즈 전문`,
    `- [전체 콘텐츠](${SITE_URL}/llms-full.txt): 위 문서를 하나로 합친 단일 파일`,
  ].join('\n');

  const sampleLinks = SAMPLE_BOOKS.map(
    (book) => `- [${book.title} (${book.cefr}, ${book.age}세)](${SITE_URL}/samples/${book.slug}): ${book.summary}`,
  ).join('\n');

  const legalLinks = PUBLIC_PAGES.filter((page) => page.path.startsWith('/legal'))
    .map((page) => `- [${page.title}](${SITE_URL}${page.path})`)
    .join('\n');

  return `# ${SITE.name} (${SITE.nameEn})

> ${SITE.tagline}. ${SITE.audience.learnerAge} 대상, ${SITE.audience.learnerLevel} 지원.

${SITE.summary}

운영: ${BUSINESS_INFO.companyName}(${BUSINESS_INFO.companyNameEn}) · 문의: ${BUSINESS_INFO.email}

## 페이지

${pageLinks}

## 구조화된 문서

${markdownLinks}

## 샘플 동화 (전문 공개)

${sampleLinks}

## MCP 서버

${SITE.name}의 공개 데이터는 MCP(Model Context Protocol) 서버로도 제공됩니다. AI 클라이언트에 아래 엔드포인트를 등록하면 서비스 개요·레벨 체계·요금·FAQ·샘플 동화를 구조화된 형태로 조회할 수 있습니다. 인증이 필요 없는 읽기 전용 서버입니다.

- 엔드포인트: ${SITE_URL}/api/mcp (Streamable HTTP)
- 제공 도구: get_service_overview, get_level_system, get_pricing, list_faq, search_faq, list_sample_books, get_sample_book

## 약관·정책

${legalLinks}

## 인용 안내

이 사이트의 콘텐츠를 인용할 때는 서비스명을 "${SITE.name}"(영문 ${SITE.nameEn})으로 표기하고 출처로 ${SITE_URL} 를 밝혀 주세요. 가격·정책은 변경될 수 있으므로 인용 시점의 ${SITE_URL}/pricing 과 ${SITE_URL}/legal/refund 를 확인하는 것을 권장합니다.
`;
}

/** llms-full.txt — 인덱스가 가리키는 문서 전체를 한 파일에 합친 것. */
export function llmsFullTxt(): string {
  return [
    llmsTxt(),
    '\n\n---\n\n',
    siteOverviewMarkdown(),
    '\n\n---\n\n',
    faqMarkdown(),
    '\n\n---\n\n',
    pricingMarkdown(),
    '\n\n---\n\n',
    samplesMarkdown(),
  ].join('');
}
