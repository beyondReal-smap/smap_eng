import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';

import { JsonLd } from '@/components/seo/json-ld';
import { SAMPLE_BOOKS, SITE } from '@/lib/content';
import { breadcrumbSchema, sampleCollectionSchema, webPageSchema } from '@/lib/seo/json-ld';

const DESCRIPTION = `${SITE.name}이 실제로 생성하는 영어 동화의 레벨별 예시 ${SAMPLE_BOOKS.length}권. 영어 본문, 문장별 한글 해석, 단어장, 완독 퀴즈까지 전문을 공개합니다.`;

export const metadata: Metadata = {
  title: '샘플 동화',
  description: DESCRIPTION,
  alternates: {
    canonical: '/samples',
    types: { 'text/markdown': '/samples.md' },
  },
  openGraph: {
    type: 'article',
    title: '하루책 샘플 동화 — 레벨별 예시',
    description: DESCRIPTION,
    url: '/samples',
  },
};

export default function SamplesPage() {
  return (
    <>
      <JsonLd
        nodes={[
          webPageSchema({ path: '/samples', name: '하루책 샘플 동화', description: DESCRIPTION }),
          sampleCollectionSchema(),
          breadcrumbSchema([
            { name: '홈', path: '/' },
            { name: '샘플 동화', path: '/samples' },
          ]),
        ]}
      />

      <div className="space-y-10">
        <header className="space-y-3">
          <h1 className="font-heading text-3xl font-extrabold tracking-tight sm:text-4xl">
            샘플 동화
          </h1>
          <p className="leading-relaxed text-muted-foreground">{DESCRIPTION}</p>
          <p className="text-sm text-muted-foreground">
            아래 샘플은 구조를 보여주기 위한 축약본입니다. 실제 생성되는 책은 레벨에 따라 17~35장으로
            구성됩니다.
          </p>
        </header>

        <ul className="grid gap-6 sm:grid-cols-2">
          {SAMPLE_BOOKS.map((book) => (
            <li key={book.slug}>
              <Link
                href={`/samples/${book.slug}`}
                className="group flex h-full flex-col gap-3 rounded-2xl border border-border/60 bg-card/40 p-5 transition-colors hover:border-primary/50 hover:bg-card/70"
              >
                <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl">
                  <Image
                    src={book.coverImage}
                    alt={book.coverAlt}
                    fill
                    sizes="(min-width: 640px) 40vw, 100vw"
                    className="object-cover"
                  />
                </div>
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold text-primary">
                    CEFR {book.cefr} · {book.age}세 · {book.genre === 'fiction' ? '동화' : '지식책'}
                  </p>
                  <h2 className="font-heading text-lg font-bold group-hover:underline underline-offset-4">
                    {book.title}
                  </h2>
                  <p className="text-sm text-muted-foreground">{book.titleKo}</p>
                  <p className="text-sm leading-relaxed text-muted-foreground">{book.summary}</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>

        <p className="text-sm">
          레벨을 어떻게 고르는지는{' '}
          <Link href="/about#levels" className="font-medium underline underline-offset-4">
            레벨 체계
          </Link>
          에서, 이용 요금은{' '}
          <Link href="/pricing" className="font-medium underline underline-offset-4">
            이용 요금
          </Link>
          에서 확인할 수 있습니다.
        </p>
      </div>
    </>
  );
}
