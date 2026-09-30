/**
 * Schema.org 구조화 데이터(JSON-LD) 빌더.
 *
 * AI 검색(생성형 답변)과 기존 검색엔진 모두 구조화 데이터를 **사실의 근거**로 쓴다.
 * HTML 본문은 마크업 노이즈 때문에 해석이 흔들리지만 JSON-LD는 그대로 신뢰된다.
 *
 * 원칙:
 *  - 값은 전부 `@/lib/content`(콘텐츠 SSOT)에서 가져온다. 이 파일에 사실을 직접
 *    적지 않는다 — 페이지 본문과 구조화 데이터가 어긋나면 스팸으로 취급된다.
 *  - `aggregateRating`·`review`는 **넣지 않는다**. 실제 수집된 평점이 없으므로
 *    날조가 되고, 구글 구조화 데이터 스팸 정책 위반이다. 실제 평점 수집 체계가
 *    생기면 그때 추가할 것.
 */

import { STAR_PACKAGES } from '@/lib/billing/packages';
import {
  BUSINESS_INFO,
  FAQ,
  HOW_IT_WORKS,
  SAMPLE_BOOKS,
  SITE,
  SITE_URL,
  type SampleBook,
} from '@/lib/content';

/** JSON-LD 노드 공통 타입. 값 구조가 스키마마다 달라 unknown으로 둔다. */
export type JsonLdNode = Record<string, unknown>;

/** 사이트 전역에서 재사용하는 발행자 노드의 @id. 중복 정의 대신 참조로 잇는다. */
const ORGANIZATION_ID = `${SITE_URL}/#organization`;
const WEBSITE_ID = `${SITE_URL}/#website`;

export function organizationSchema(): JsonLdNode {
  return {
    '@type': 'Organization',
    '@id': ORGANIZATION_ID,
    name: BUSINESS_INFO.companyName,
    alternateName: BUSINESS_INFO.companyNameEn,
    url: SITE_URL,
    logo: `${SITE_URL}/book_icon.png`,
    email: BUSINESS_INFO.email,
    telephone: BUSINESS_INFO.phone,
    founder: { '@type': 'Person', name: BUSINESS_INFO.ceoName },
    foundingDate: BUSINESS_INFO.establishedAt,
    address: {
      '@type': 'PostalAddress',
      addressCountry: 'KR',
      streetAddress: BUSINESS_INFO.address,
    },
    // 한국 사업자등록번호 — 국가별 사업자 식별자를 나타내는 표준 속성.
    taxID: BUSINESS_INFO.registrationNumber,
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer support',
      email: BUSINESS_INFO.email,
      telephone: BUSINESS_INFO.phone,
      availableLanguage: ['ko'],
    },
  };
}

export function webSiteSchema(): JsonLdNode {
  return {
    '@type': 'WebSite',
    '@id': WEBSITE_ID,
    name: SITE.name,
    alternateName: SITE.nameEn,
    url: SITE_URL,
    description: SITE.tagline,
    inLanguage: 'ko',
    publisher: { '@id': ORGANIZATION_ID },
  };
}

/**
 * 서비스 본체 — 웹앱 + 모바일 앱. 가격은 별 패키지의 최저가를 lowPrice로 노출한다.
 * `offers`에 AggregateOffer를 쓰면 "얼마부터 시작"이 AI 답변에 그대로 인용된다.
 */
export function softwareApplicationSchema(): JsonLdNode {
  const prices = STAR_PACKAGES.map((pack) => pack.priceKrw);

  return {
    '@type': 'SoftwareApplication',
    '@id': `${SITE_URL}/#app`,
    name: SITE.name,
    alternateName: SITE.nameEn,
    url: SITE_URL,
    applicationCategory: 'EducationalApplication',
    applicationSubCategory: '영어 리딩 학습',
    operatingSystem: 'Web, iOS, Android',
    inLanguage: 'ko',
    description: SITE.summary,
    publisher: { '@id': ORGANIZATION_ID },
    audience: {
      '@type': 'EducationalAudience',
      educationalRole: 'student',
      audienceType: SITE.audience.buyer,
      suggestedMinAge: 5,
      suggestedMaxAge: 10,
    },
    featureList: [
      '아이 맞춤 영어 동화 생성',
      '문장별 원어민 음성 낭독',
      '문장 단위 한글 해석',
      '완독 후 4지선다 퀴즈',
      '단어장 간격 반복 복습',
      '보호자 학습 리포트',
      '가족 프로필 전환',
    ],
    offers: {
      '@type': 'AggregateOffer',
      priceCurrency: 'KRW',
      lowPrice: Math.min(...prices),
      highPrice: Math.max(...prices),
      offerCount: STAR_PACKAGES.length,
      offers: STAR_PACKAGES.map((pack) => ({
        '@type': 'Offer',
        name: pack.name,
        description: `${pack.tagline} — 별 ${pack.stars}개(동화 ${pack.stars}권)`,
        price: pack.priceKrw,
        priceCurrency: 'KRW',
        url: `${SITE_URL}/pricing`,
        availability: 'https://schema.org/InStock',
        category: 'DigitalCredit',
      })),
    },
  };
}

export function faqPageSchema(): JsonLdNode {
  return {
    '@type': 'FAQPage',
    '@id': `${SITE_URL}/faq#faqpage`,
    inLanguage: 'ko',
    isPartOf: { '@id': WEBSITE_ID },
    mainEntity: FAQ.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: { '@type': 'Answer', text: item.answer },
    })),
  };
}

export function howToSchema(): JsonLdNode {
  return {
    '@type': 'HowTo',
    '@id': `${SITE_URL}/about#howto`,
    name: `${SITE.name} 이용 방법`,
    description: `${SITE.name}에서 아이 맞춤 영어 동화를 만들고 낭독·퀴즈·단어 복습까지 진행하는 순서`,
    inLanguage: 'ko',
    step: HOW_IT_WORKS.map((step) => ({
      '@type': 'HowToStep',
      position: step.step,
      name: step.title,
      text: step.description,
    })),
  };
}

/** 샘플 동화 1권 — Book 타입. 본문이 공개되어 있으므로 실제 인용 대상이 된다. */
export function sampleBookSchema(book: SampleBook): JsonLdNode {
  return {
    '@type': 'Book',
    '@id': `${SITE_URL}/samples/${book.slug}#book`,
    name: book.title,
    alternateName: book.titleKo,
    url: `${SITE_URL}/samples/${book.slug}`,
    description: book.summary,
    inLanguage: 'en',
    bookFormat: 'https://schema.org/EBook',
    image: `${SITE_URL}${book.coverImage}`,
    about: book.topic,
    genre: book.genre === 'fiction' ? "Children's fiction" : "Children's non-fiction",
    numberOfPages: book.passages.length,
    isAccessibleForFree: true,
    publisher: { '@id': ORGANIZATION_ID },
    // 생성 주체를 숨기지 않는다 — AI 생성물임을 명시하는 편이 신뢰도에 유리하다.
    creator: { '@type': 'Organization', name: `${SITE.name} AI` },
    audience: {
      '@type': 'EducationalAudience',
      educationalRole: 'student',
      suggestedMinAge: book.age,
    },
    educationalLevel: `CEFR ${book.cefr}`,
    learningResourceType: '영어 리딩 교재',
  };
}

export function sampleCollectionSchema(): JsonLdNode {
  return {
    '@type': 'CollectionPage',
    '@id': `${SITE_URL}/samples#collection`,
    name: `${SITE.name} 샘플 동화`,
    description: `${SITE.name}이 생성하는 영어 동화의 레벨별 예시 ${SAMPLE_BOOKS.length}권. 본문·한글 해석·단어장·퀴즈 전문 공개.`,
    inLanguage: 'ko',
    isPartOf: { '@id': WEBSITE_ID },
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: SAMPLE_BOOKS.length,
      itemListElement: SAMPLE_BOOKS.map((book, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        url: `${SITE_URL}/samples/${book.slug}`,
        name: book.title,
      })),
    },
  };
}

export function breadcrumbSchema(trail: Array<{ name: string; path: string }>): JsonLdNode {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((crumb, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: crumb.name,
      item: `${SITE_URL}${crumb.path}`,
    })),
  };
}

/** 일반 콘텐츠 페이지(소개·요금 등)의 WebPage 노드. */
export function webPageSchema(args: {
  path: string;
  name: string;
  description: string;
}): JsonLdNode {
  return {
    '@type': 'WebPage',
    '@id': `${SITE_URL}${args.path}#webpage`,
    url: `${SITE_URL}${args.path}`,
    name: args.name,
    description: args.description,
    inLanguage: 'ko',
    isPartOf: { '@id': WEBSITE_ID },
    about: { '@id': `${SITE_URL}/#app` },
  };
}

/**
 * 여러 노드를 하나의 `@graph` 문서로 합친다.
 *
 * 노드마다 `<script>`를 따로 심으면 노드 간 `@id` 참조가 끊어져 크롤러가
 * Organization과 WebPage를 별개 사실로 취급한다. 페이지당 한 개의 graph가 정답.
 */
export function jsonLdGraph(nodes: JsonLdNode[]): JsonLdNode {
  return { '@context': 'https://schema.org', '@graph': nodes };
}
