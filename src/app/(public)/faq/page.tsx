import type { Metadata } from 'next';
import Link from 'next/link';

import { JsonLd } from '@/components/seo/json-ld';
import { FAQ, faqByCategory, SITE } from '@/lib/content';
import { breadcrumbSchema, faqPageSchema, webPageSchema } from '@/lib/seo/json-ld';

const DESCRIPTION = `${SITE.name} 이용에 대한 자주 묻는 질문 ${FAQ.length}가지. 대상 연령, 레벨 선택, 낭독과 해석, 퀴즈와 단어장, 요금과 환불, 아이 개인정보까지 정리했습니다.`;

export const metadata: Metadata = {
  title: '자주 묻는 질문',
  description: DESCRIPTION,
  alternates: {
    canonical: '/faq',
    types: { 'text/markdown': '/faq.md' },
  },
  openGraph: {
    type: 'article',
    title: '하루책 자주 묻는 질문',
    description: DESCRIPTION,
    url: '/faq',
  },
};

/**
 * FAQ — 생성형 검색이 가장 직접적으로 인용하는 페이지 형태.
 *
 * 질문을 `<h3>`, 답변을 바로 뒤 `<p>`로 두는 평평한 구조를 쓴다. 아코디언으로
 * 접어 두면 사람에게는 깔끔하지만 일부 크롤러는 `hidden` 콘텐츠의 가중치를 낮추고,
 * 무엇보다 답변이 화면에 없으면 "실제로 보이는 내용"인지 판정이 흔들린다.
 * 같은 내용을 FAQPage JSON-LD로도 함께 내보내 마크업과 구조화 데이터를 일치시킨다.
 */
export default function FaqPage() {
  const groups = faqByCategory();

  return (
    <>
      <JsonLd
        nodes={[
          webPageSchema({ path: '/faq', name: '하루책 자주 묻는 질문', description: DESCRIPTION }),
          faqPageSchema(),
          breadcrumbSchema([
            { name: '홈', path: '/' },
            { name: '자주 묻는 질문', path: '/faq' },
          ]),
        ]}
      />

      <article className="space-y-10">
        <header className="space-y-3">
          <h1 className="font-heading text-3xl font-extrabold tracking-tight sm:text-4xl">
            자주 묻는 질문
          </h1>
          <p className="leading-relaxed text-muted-foreground">{DESCRIPTION}</p>
        </header>

        <nav aria-label="질문 분류" className="flex flex-wrap gap-2">
          {groups.map((group) => (
            <a
              key={group.category}
              href={`#faq-${group.category}`}
              className="rounded-full border border-border/60 px-4 py-1.5 text-sm font-medium transition-colors hover:bg-muted"
            >
              {group.category}
            </a>
          ))}
        </nav>

        {groups.map((group) => (
          <section key={group.category} id={`faq-${group.category}`} className="space-y-6 scroll-mt-24">
            <h2 className="font-heading text-2xl font-bold tracking-tight">{group.category}</h2>
            <div className="space-y-6">
              {group.items.map((item) => (
                <div key={item.id} id={item.id} className="space-y-2 scroll-mt-24">
                  <h3 className="font-semibold leading-snug">{item.question}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">{item.answer}</p>
                </div>
              ))}
            </div>
          </section>
        ))}

        <section className="space-y-3 rounded-2xl border border-border/60 bg-muted/30 p-6">
          <h2 className="font-heading text-lg font-bold">답을 찾지 못하셨나요?</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            서비스 소개와 레벨 체계는{' '}
            <Link href="/about" className="font-medium underline underline-offset-4">
              하루책 소개
            </Link>
            , 실제 생성 결과는{' '}
            <Link href="/samples" className="font-medium underline underline-offset-4">
              샘플 동화
            </Link>
            , 요금은{' '}
            <Link href="/pricing" className="font-medium underline underline-offset-4">
              이용 요금
            </Link>
            에서 확인할 수 있습니다. 그 밖의 문의는 {SITE.name} 고객문의 이메일로 보내 주세요.
          </p>
        </section>
      </article>
    </>
  );
}
