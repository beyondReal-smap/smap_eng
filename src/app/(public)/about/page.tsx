import type { Metadata } from 'next';
import Link from 'next/link';

import { JsonLd } from '@/components/seo/json-ld';
import {
  AGE_RANGE,
  BUSINESS_INFO,
  FEATURES,
  HOW_IT_WORKS,
  LEVELS,
  LEVEL_GUIDANCE,
  PLATFORMS,
  SITE,
} from '@/lib/content';
import {
  breadcrumbSchema,
  howToSchema,
  softwareApplicationSchema,
  webPageSchema,
} from '@/lib/seo/json-ld';

export const metadata: Metadata = {
  title: '하루책 소개',
  description: SITE.summary,
  alternates: {
    canonical: '/about',
    // 크롤러가 같은 내용의 마크다운 버전을 바로 찾아갈 수 있도록 대체 표현을 명시.
    types: { 'text/markdown': '/about.md' },
  },
  openGraph: {
    type: 'article',
    title: '하루책 소개 — 아이 맞춤 AI 영어 동화 서비스',
    description: SITE.summary,
    url: '/about',
  },
};

/**
 * 서비스 소개 — "하루책이 뭐야?"라는 질의에 AI가 그대로 인용할 수 있는 페이지.
 *
 * 구성 원칙: 각 섹션이 하나의 질문에 답한다(무엇인가 / 누구를 위한 것인가 /
 * 어떻게 쓰는가 / 무엇이 되는가 / 레벨은 어떻게 나뉘는가 / 어디서 쓰는가).
 * 생성형 검색은 문단 단위로 근거를 뽑아가므로 섹션 하나가 독립적으로 완결되어야 한다.
 */
export default function AboutPage() {
  return (
    <>
      <JsonLd
        nodes={[
          webPageSchema({ path: '/about', name: '하루책 소개', description: SITE.summary }),
          softwareApplicationSchema(),
          howToSchema(),
          breadcrumbSchema([
            { name: '홈', path: '/' },
            { name: '하루책 소개', path: '/about' },
          ]),
        ]}
      />

      <article className="space-y-12">
        <header className="space-y-4">
          <h1 className="font-heading text-3xl font-extrabold tracking-tight sm:text-4xl">
            하루책 소개
          </h1>
          <p className="text-lg font-medium text-foreground/90">{SITE.tagline}</p>
          <p className="leading-relaxed text-muted-foreground">{SITE.summary}</p>
        </header>

        <section aria-labelledby="audience" className="space-y-4">
          <h2 id="audience" className="font-heading text-2xl font-bold tracking-tight">
            누구를 위한 서비스인가요
          </h2>
          <dl className="grid gap-x-6 gap-y-3 rounded-2xl border border-border/60 bg-card/40 p-5 sm:grid-cols-[10rem_1fr]">
            <dt className="font-semibold">학습자 연령</dt>
            <dd className="text-muted-foreground">{SITE.audience.learnerAge}</dd>
            <dt className="font-semibold">영어 레벨</dt>
            <dd className="text-muted-foreground">{SITE.audience.learnerLevel}</dd>
            <dt className="font-semibold">계정 개설</dt>
            <dd className="text-muted-foreground">{SITE.audience.buyer}</dd>
            <dt className="font-semibold">서비스 언어</dt>
            <dd className="text-muted-foreground">
              {SITE.languages.ui} 인터페이스 · {SITE.languages.content}
            </dd>
          </dl>
        </section>

        <section aria-labelledby="how" className="space-y-4">
          <h2 id="how" className="font-heading text-2xl font-bold tracking-tight">
            이용 흐름
          </h2>
          <ol className="space-y-4">
            {HOW_IT_WORKS.map((step) => (
              <li key={step.step} className="flex gap-4">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                  {step.step}
                </span>
                <div className="space-y-1">
                  <h3 className="font-semibold">{step.title}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {step.description}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="features" className="space-y-4">
          <h2 id="features" className="font-heading text-2xl font-bold tracking-tight">
            주요 기능
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {FEATURES.map((feature) => (
              <article
                key={feature.id}
                className="space-y-2 rounded-2xl border border-border/60 bg-card/40 p-5"
              >
                <h3 className="font-semibold">{feature.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {feature.description}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section aria-labelledby="levels" className="space-y-4">
          <h2 id="levels" className="font-heading text-2xl font-bold tracking-tight">
            레벨 체계
          </h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            책은 연령({AGE_RANGE.min}~{AGE_RANGE.max}세)과 CEFR 레벨(A1~B2)을 함께 지정해
            생성됩니다. 지문(화면) 한 장은 3문장으로 고정됩니다.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[42rem] border-collapse text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="py-2 pr-4 font-semibold">CEFR</th>
                  <th className="py-2 pr-4 font-semibold">권장 연령</th>
                  <th className="py-2 pr-4 font-semibold">지문 수</th>
                  <th className="py-2 pr-4 font-semibold">지문당 단어</th>
                  <th className="py-2 pr-4 font-semibold">단어장</th>
                  <th className="py-2 font-semibold">문법 범위</th>
                </tr>
              </thead>
              <tbody>
                {LEVELS.map((level) => (
                  <tr
                    key={`${level.cefr}-${level.recommendedAge}`}
                    className="border-b border-border/50 align-top"
                  >
                    <td className="py-3 pr-4 font-semibold">{level.cefr}</td>
                    <td className="py-3 pr-4 text-muted-foreground">{level.recommendedAge}</td>
                    <td className="py-3 pr-4 text-muted-foreground">{level.passageCount}</td>
                    <td className="py-3 pr-4 text-muted-foreground">{level.wordsPerPassage}</td>
                    <td className="py-3 pr-4 text-muted-foreground">{level.vocabCount}</td>
                    <td className="py-3 text-muted-foreground">{level.grammar}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="space-y-3">
            {LEVELS.map((level) => (
              <p key={`${level.cefr}-${level.recommendedAge}-ex`} className="text-sm">
                <strong className="font-semibold">
                  {level.cefr} ({level.recommendedAge})
                </strong>{' '}
                <span className="text-muted-foreground">— {level.label}</span>
                <br />
                <span className="italic text-muted-foreground">“{level.example}”</span>
              </p>
            ))}
          </div>
          <p className="rounded-2xl border border-border/60 bg-muted/30 p-5 text-sm leading-relaxed text-muted-foreground">
            <strong className="font-semibold text-foreground">레벨 선택 기준</strong> —{' '}
            {LEVEL_GUIDANCE}
          </p>
          <p className="text-sm">
            실제 생성 결과가 궁금하다면{' '}
            <Link href="/samples" className="font-medium underline underline-offset-4">
              레벨별 샘플 동화
            </Link>
            에서 본문·해석·단어장·퀴즈 전문을 확인할 수 있습니다.
          </p>
        </section>

        <section aria-labelledby="platforms" className="space-y-4">
          <h2 id="platforms" className="font-heading text-2xl font-bold tracking-tight">
            제공 플랫폼
          </h2>
          <ul className="space-y-3">
            {PLATFORMS.map((platform) => (
              <li key={platform.id} className="text-sm">
                <strong className="font-semibold">{platform.name}</strong>{' '}
                <span className="text-muted-foreground">— {platform.description}</span>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="operator" className="space-y-4">
          <h2 id="operator" className="font-heading text-2xl font-bold tracking-tight">
            운영 주체
          </h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {BUSINESS_INFO.companyName}({BUSINESS_INFO.companyNameEn}) · 대표{' '}
            {BUSINESS_INFO.ceoName} · 사업자등록번호 {BUSINESS_INFO.registrationNumber} ·
            통신판매업신고 {BUSINESS_INFO.mailOrderRegistration} · 문의{' '}
            {BUSINESS_INFO.email}
          </p>
          <p className="text-sm">
            <Link href="/faq" className="font-medium underline underline-offset-4">
              자주 묻는 질문
            </Link>
            {' · '}
            <Link href="/pricing" className="font-medium underline underline-offset-4">
              이용 요금
            </Link>
            {' · '}
            <Link href="/legal/terms" className="font-medium underline underline-offset-4">
              이용약관
            </Link>
          </p>
        </section>
      </article>
    </>
  );
}
