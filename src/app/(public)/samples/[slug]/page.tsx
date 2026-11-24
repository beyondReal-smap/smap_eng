import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { JsonLd } from '@/components/seo/json-ld';
import { SAMPLE_BOOKS, SITE, getSampleBook } from '@/lib/content';
import { breadcrumbSchema, sampleBookSchema } from '@/lib/seo/json-ld';

interface PageProps {
  // Next.js 16: 동적 세그먼트 params는 Promise로 전달된다(await 필수).
  params: Promise<{ slug: string }>;
}

/** 샘플은 정적 3권으로 고정 — 빌드 시점에 전부 미리 렌더한다. */
export function generateStaticParams() {
  return SAMPLE_BOOKS.map((book) => ({ slug: book.slug }));
}

/** 목록에 없는 slug로 임의 URL이 생성되지 않도록 차단(색인 낭비·404 소프트 방지). */
export const dynamicParams = false;

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const book = getSampleBook(slug);
  if (!book) return {};

  const description = `${book.summary} CEFR ${book.cefr}, 권장 ${book.age}세. 영어 본문과 문장별 한글 해석, 단어장 ${book.vocabulary.length}개, 완독 퀴즈 ${book.quiz.length}문항 전문 공개.`;

  return {
    title: `${book.title} — 샘플 동화`,
    description,
    alternates: { canonical: `/samples/${book.slug}` },
    openGraph: {
      type: 'article',
      title: `${book.title} (${book.titleKo}) — ${SITE.name} 샘플 동화`,
      description,
      url: `/samples/${book.slug}`,
      images: [{ url: book.coverImage, alt: book.coverAlt }],
    },
  };
}

/**
 * 샘플 동화 전문 페이지 — AI가 인용할 수 있는 **유일한 실제 본문 콘텐츠**.
 *
 * 영어 원문과 한글 해석을 나란히 두고, 단어장과 퀴즈(정답 포함)까지 모두
 * 서버 렌더링한다. 크롤러가 JS 실행 없이 전부 읽을 수 있어야 하므로
 * 클라이언트 상호작용(정답 토글 등)은 `<details>` 같은 네이티브 요소로만 처리한다.
 */
export default async function SampleBookPage({ params }: PageProps) {
  const { slug } = await params;
  const book = getSampleBook(slug);
  if (!book) notFound();

  return (
    <>
      <JsonLd
        nodes={[
          sampleBookSchema(book),
          breadcrumbSchema([
            { name: '홈', path: '/' },
            { name: '샘플 동화', path: '/samples' },
            { name: book.title, path: `/samples/${book.slug}` },
          ]),
        ]}
      />

      <article className="space-y-10">
        <header className="space-y-4">
          <p className="text-sm">
            <Link href="/samples" className="text-muted-foreground underline underline-offset-4">
              샘플 동화
            </Link>
          </p>
          <div className="relative aspect-[16/9] w-full overflow-hidden rounded-2xl">
            <Image
              src={book.coverImage}
              alt={book.coverAlt}
              fill
              priority
              sizes="(min-width: 880px) 880px, 100vw"
              className="object-cover"
            />
          </div>
          <div className="space-y-2">
            <h1 className="font-heading text-3xl font-extrabold tracking-tight sm:text-4xl">
              {book.title}
            </h1>
            <p className="text-lg text-muted-foreground">{book.titleKo}</p>
          </div>
          <dl className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            <div className="flex gap-2">
              <dt className="font-semibold">레벨</dt>
              <dd className="text-muted-foreground">
                CEFR {book.cefr} · 권장 {book.age}세
              </dd>
            </div>
            <div className="flex gap-2">
              <dt className="font-semibold">장르</dt>
              <dd className="text-muted-foreground">
                {book.genre === 'fiction' ? '픽션 동화' : '논픽션 지식책'}
              </dd>
            </div>
            <div className="flex gap-2">
              <dt className="font-semibold">주제</dt>
              <dd className="text-muted-foreground">{book.topic}</dd>
            </div>
          </dl>
          <p className="leading-relaxed text-muted-foreground">{book.summary}</p>
          <p className="rounded-xl border border-border/60 bg-muted/30 p-4 text-sm text-muted-foreground">
            이 샘플은 구조를 보여주기 위한 축약본({book.passages.length}장)입니다. 실제 생성되는
            책은 레벨에 따라 17~35장으로 구성되며, 모든 문장에 음성 낭독이 함께 제공됩니다.
          </p>
        </header>

        <section aria-labelledby="body" className="space-y-6">
          <h2 id="body" className="font-heading text-2xl font-bold tracking-tight">
            본문
          </h2>
          <ol className="space-y-8">
            {book.passages.map((passage) => (
              <li key={passage.index} className="space-y-3">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  {passage.index + 1}장
                </p>
                <div className="space-y-3">
                  {passage.en.map((sentence, i) => (
                    <div key={sentence} className="space-y-1">
                      <p lang="en" className="text-lg leading-relaxed">
                        {sentence}
                      </p>
                      <p lang="ko" className="text-sm text-muted-foreground">
                        {passage.ko[i]}
                      </p>
                    </div>
                  ))}
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="vocab" className="space-y-4">
          <h2 id="vocab" className="font-heading text-2xl font-bold tracking-tight">
            단어장
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[32rem] border-collapse text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="py-2 pr-4 font-semibold">단어</th>
                  <th className="py-2 pr-4 font-semibold">뜻</th>
                  <th className="py-2 font-semibold">본문 예문</th>
                </tr>
              </thead>
              <tbody>
                {book.vocabulary.map((item) => (
                  <tr key={item.word} className="border-b border-border/50 align-top">
                    <td lang="en" className="py-3 pr-4 font-semibold">
                      {item.word}
                    </td>
                    <td className="py-3 pr-4 text-muted-foreground">{item.meaning}</td>
                    <td lang="en" className="py-3 italic text-muted-foreground">
                      {item.example}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section aria-labelledby="quiz" className="space-y-4">
          <h2 id="quiz" className="font-heading text-2xl font-bold tracking-tight">
            완독 퀴즈
          </h2>
          <p className="text-sm text-muted-foreground">
            실제 서비스에서는 책을 다 읽은 뒤 4지선다 {book.quiz.length}문항이 제시되고 정답률이
            보호자 리포트에 기록됩니다.
          </p>
          <ol className="space-y-6">
            {book.quiz.map((item, index) => (
              <li key={item.question} className="space-y-2">
                <p lang="en" className="font-medium">
                  {index + 1}. {item.question}
                </p>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  {item.choices.map((choice, ci) => (
                    <li key={choice} lang="en">
                      {ci + 1}) {choice}
                    </li>
                  ))}
                </ul>
                {/* 네이티브 <details> — JS 없이 접히므로 크롤러는 정답까지 모두 읽는다. */}
                <details className="text-sm">
                  <summary className="cursor-pointer font-medium text-primary">정답 보기</summary>
                  <p lang="en" className="mt-1 text-muted-foreground">
                    {item.answerIndex + 1}) {item.choices[item.answerIndex]}
                  </p>
                </details>
              </li>
            ))}
          </ol>
        </section>

        <section className="space-y-3 rounded-2xl border border-border/60 bg-muted/30 p-6">
          <h2 className="font-heading text-lg font-bold">우리 아이 이야기도 만들어 보세요</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            아이의 나이와 레벨, 좋아하는 소재를 입력하면 이런 책이 새로 만들어집니다. 요금은{' '}
            <Link href="/pricing" className="font-medium underline underline-offset-4">
              이용 요금
            </Link>
            , 서비스 개요는{' '}
            <Link href="/about" className="font-medium underline underline-offset-4">
              하루책 소개
            </Link>
            에서 확인하세요.
          </p>
        </section>
      </article>
    </>
  );
}
