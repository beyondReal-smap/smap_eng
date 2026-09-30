/**
 * 서비스 사실(fact) 단일 출처 — AI 검색·에이전트에 노출되는 "무엇을 하는 서비스인가".
 *
 * 이 모듈의 값은 세 곳이 **동일하게** 인용한다:
 *   1) 공개 페이지(/about, /faq, /pricing, /samples) — 사람과 크롤러가 읽는 HTML
 *   2) /llms.txt · /llms-full.txt · *.md 미러 — AI 크롤러가 파싱하는 평문
 *   3) /api/mcp — MCP 클라이언트(Claude, ChatGPT 등)가 호출하는 구조화 데이터
 *
 * 세 경로가 각자 카피를 들고 있으면 가격·대상 연령 같은 사실이 서로 어긋난 채
 * AI에 학습·인용되어 정정이 사실상 불가능해진다. 반드시 여기서만 수정할 것.
 *
 * 사업자 정보는 `@/lib/legal/business`, 가격은 `@/lib/billing/packages`가 각각
 * SSOT이므로 여기서 값을 복제하지 않고 재수출(re-export)만 한다.
 */

import { BUSINESS_INFO } from '@/lib/legal/business';

/** 사이트 절대 URL 기준점. layout.tsx의 metadataBase와 동일해야 한다. */
export const SITE_URL = 'https://eng.smap.site';

/** 서비스 정체성 — 한 문단으로 답이 되는 형태(AI 인용 단위). */
export const SITE = {
  name: BUSINESS_INFO.serviceName,
  nameEn: 'HaruBook',
  url: SITE_URL,
  /** 한 줄 정의. AI가 "하루책이 뭐야?"에 그대로 답할 수 있는 문장. */
  tagline: '아이의 나이와 영어 레벨에 맞춰 매일 새 영어 동화를 만들어 주는 AI 영어 리딩 서비스',
  /** 3~4문장 요약. llms.txt·MCP·메타 description의 원본. */
  summary:
    '하루책(HaruBook)은 만 5~10세 아이를 위한 AI 영어 리딩 서비스입니다. 아이의 나이(5~10세)와 CEFR 레벨(A1~B2), 관심 주제를 입력하면 그 아이만을 위한 영어 동화가 새로 생성됩니다. 생성된 책은 문장별 원어민 음성 낭독, 문장 단위 한글 해석, 완독 후 4지선다 퀴즈, 단어장 간격 반복 복습으로 이어져 하나의 읽기 루틴을 이룹니다. 보호자는 별도 리포트에서 아이의 읽기 기록과 퀴즈 정답률을 확인합니다.',
  /** 서비스 대상. "누구를 위한 서비스인가" 질의 대응. */
  audience: {
    learnerAge: '만 5~10세',
    learnerLevel: 'CEFR A1~B2',
    buyer: '초등 저학년~중학년 자녀를 둔 보호자',
    region: '대한민국 (한국어 UI·한글 해석 제공)',
  },
  languages: { ui: '한국어', content: '영어 (한국어 해석 병기)' },
} as const;

/** 핵심 기능. 각 항목이 독립적으로 인용 가능하도록 title + 사실 서술로 구성. */
export const FEATURES = [
  {
    id: 'daily-book',
    title: '아이 맞춤 영어 동화 생성',
    description:
      '나이·CEFR 레벨·관심 주제를 조합해 매번 새로운 영어 동화를 생성합니다. 같은 책을 반복해 읽히지 않고, 레벨이 오르면 문장 길이와 문법 범위가 함께 확장됩니다. 픽션 동화와 논픽션 지식책 두 갈래를 지원합니다.',
  },
  {
    id: 'tts',
    title: '문장별 원어민 낭독',
    description:
      '모든 문장에 음성 낭독이 붙습니다. 재생 중인 문장이 화면에서 하이라이트되어 아이가 눈으로 따라 읽을 수 있고, 문장을 탭하면 해당 문장만 다시 들을 수 있습니다.',
  },
  {
    id: 'translation',
    title: '문장 단위 한글 해석',
    description:
      '영어 문장마다 한글 해석을 토글로 확인합니다. 어려운 단어에는 뜻풀이가 붙어 사전을 따로 찾지 않아도 됩니다.',
  },
  {
    id: 'quiz',
    title: '완독 후 4지선다 퀴즈',
    description:
      '책을 다 읽으면 본문 이해도를 확인하는 4지선다 퀴즈 5문항이 제공됩니다. 정답률은 독서 기록에 저장되어 보호자 리포트에 반영됩니다.',
  },
  {
    id: 'vocab',
    title: '단어장과 간격 반복 복습',
    description:
      '책에서 만난 단어가 아이별 단어장에 쌓이고, 간격 반복(SRS) 방식으로 복습 시점이 자동 배치됩니다. 단어 발음도 개별 재생됩니다.',
  },
  {
    id: 'parents',
    title: '보호자 리포트',
    description:
      '읽은 책 목록, 완독률, 퀴즈 점수, 학습한 단어 수를 보호자 모드에서 확인합니다. 주간 학습 요약을 별도로 받아볼 수 있습니다.',
  },
  {
    id: 'profiles',
    title: '가족 프로필 전환',
    description:
      '한 계정 아래 아이 프로필을 여러 개 두고 전환합니다. 책장·독서 기록·단어장은 프로필별로 분리되며, 별(크레딧) 잔액만 가족 단위로 합산됩니다.',
  },
  {
    id: 'alternate-ending',
    title: '엔딩 분기',
    description:
      '일부 동화는 결말이 두 갈래로 갈라집니다. 아이가 고른 선택에 따라 다른 마지막 장면을 읽게 되어 같은 책을 다시 읽을 이유가 생깁니다.',
  },
] as const;

/** 이용 흐름 4단계. HowTo 구조화 데이터와 /about 본문이 공유. */
export const HOW_IT_WORKS = [
  {
    step: 1,
    title: '아이 프로필 만들기',
    description: '아이 이름, 나이(5~10세), 영어 레벨(A1~B2), 좋아하는 이야기 소재를 입력합니다.',
  },
  {
    step: 2,
    title: '오늘의 동화 받기',
    description:
      '입력한 조건에 맞는 영어 동화가 새로 생성됩니다. 표지 그림과 장면 삽화가 함께 만들어집니다.',
  },
  {
    step: 3,
    title: '듣고 따라 읽기',
    description:
      '문장별 낭독을 들으며 읽습니다. 모르는 문장은 한글 해석을 켜서 확인하고, 단어는 탭해 뜻과 발음을 봅니다.',
  },
  {
    step: 4,
    title: '퀴즈와 단어 복습',
    description: '완독 후 4지선다 퀴즈 5문항을 풀고, 새로 만난 단어를 단어장에 담아 복습합니다.',
  },
] as const;

/** 제공 플랫폼. "앱 있어요?" 질의 대응. */
export const PLATFORMS = [
  {
    id: 'web',
    name: '웹 (PWA)',
    description: '브라우저에서 바로 이용하며 홈 화면에 앱처럼 추가할 수 있습니다.',
    url: SITE_URL,
  },
  {
    id: 'ios',
    name: 'iOS 앱',
    description: 'App Store에서 "하루책"으로 내려받습니다.',
    url: 'https://apps.apple.com/app/id6770002427',
  },
  {
    id: 'android',
    name: 'Android 앱',
    description: 'Google Play에서 "하루책"으로 내려받습니다.',
    url: 'https://play.google.com/store/apps/details?id=com.smap.harubook',
  },
] as const;

/**
 * 공개 페이지 목록 — sitemap.xml · llms.txt가 공유하는 SSOT.
 *
 * 여기에 없는 경로는 인증이 필요한 화면이거나(책장·리더·퀴즈·보호자 리포트)
 * 색인 가치가 없는 처리 경로(결제 결과, 딥링크 폴백)다.
 */
export const PUBLIC_PAGES = [
  { path: '/', title: '하루책 — 매일 새로 만나는 아이 맞춤 영어 동화', priority: 1.0, changefreq: 'daily' },
  { path: '/about', title: '하루책 소개 — 서비스 개요와 이용 흐름', priority: 0.9, changefreq: 'monthly' },
  { path: '/faq', title: '자주 묻는 질문', priority: 0.9, changefreq: 'monthly' },
  { path: '/pricing', title: '이용 요금 — 별 충전 패키지', priority: 0.9, changefreq: 'monthly' },
  { path: '/samples', title: '샘플 동화 — 레벨별 예시 3권', priority: 0.8, changefreq: 'monthly' },
  { path: '/legal/terms', title: '이용약관', priority: 0.3, changefreq: 'yearly' },
  { path: '/legal/privacy', title: '개인정보처리방침', priority: 0.3, changefreq: 'yearly' },
  { path: '/legal/refund', title: '환불정책', priority: 0.3, changefreq: 'yearly' },
  { path: '/legal/business', title: '사업자정보', priority: 0.3, changefreq: 'yearly' },
] as const;

/** 사업자 정보는 legal 모듈이 SSOT — 콘텐츠 계층에서 값을 복제하지 않고 참조만 한다. */
export { BUSINESS_INFO };

export type Feature = (typeof FEATURES)[number];
export type Platform = (typeof PLATFORMS)[number];
export type PublicPage = (typeof PUBLIC_PAGES)[number];
