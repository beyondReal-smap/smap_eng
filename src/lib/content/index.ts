/**
 * 공개 콘텐츠 계층의 공개 API.
 *
 * 페이지·마크다운 라우트·MCP 서버는 이 배럴만 import 한다(개별 파일 직접 참조 금지).
 * 콘텐츠 파일이 쪼개지거나 합쳐져도 소비자 코드를 건드리지 않기 위한 경계다.
 */

export {
  SITE,
  SITE_URL,
  FEATURES,
  HOW_IT_WORKS,
  PLATFORMS,
  PUBLIC_PAGES,
  BUSINESS_INFO,
  type Feature,
  type Platform,
  type PublicPage,
} from './site';

export { LEVELS, AGE_RANGE, LEVEL_GUIDANCE, type LevelSpec } from './levels';

export {
  FAQ,
  FAQ_CATEGORIES,
  faqByCategory,
  searchFaq,
  type FaqItem,
  type FaqCategory,
} from './faq';

export {
  SAMPLE_BOOKS,
  getSampleBook,
  sampleBookSummaries,
  sampleBookPlainText,
  type SampleBook,
  type SamplePassage,
  type SampleVocabItem,
  type SampleQuiz,
} from './sample-books';

export {
  siteOverviewMarkdown,
  levelsMarkdown,
  faqMarkdown,
  pricingMarkdown,
  sampleBookMarkdown,
  samplesMarkdown,
  llmsTxt,
  llmsFullTxt,
} from './markdown';
