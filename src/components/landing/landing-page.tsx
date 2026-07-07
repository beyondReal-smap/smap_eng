/**
 * 비로그인 방문자에게 보여줄 랜딩 페이지.
 *
 * 메인 앱(src/app)으로 통합되며, 기존 Tailwind globals와 충돌하지 않도록
 * 최상위 `<div className="landing-scope">` 안에서만 동작한다. 랜딩 전용
 * `.page/.nav/.brand/.button/.hero/.steps/.books/.features/.final/.footer`
 * 클래스는 `globals.css`에서 `.landing-scope` 자손 셀렉터로 격리된다.
 *
 * 헤더는 단일 `AppHeader`(variant="landing")가 담당한다(2026-04-26 통합).
 * 본문/footer만 이 컴포넌트가 그린다.
 *
 * 원본: apps/landing/src/app/page.tsx (LP 통합 전)
 * 동작 변경 없음 — 링크/카피는 보존하고 시각 자산만 교체.
 */
import Image from 'next/image';

import { AppHeader } from '@/components/app-header';
import { SiteFooter } from '@/components/site-footer';

const steps = [
  {
    n: 1,
    title: '아이 프로필',
    body: '이름, 나이, 영어 레벨, 좋아하는 이야기 소재를 살짝 알려주세요.',
  },
  {
    n: 2,
    title: '오늘의 동화',
    body: '아이에게 딱 맞는 새 영어 동화가 매일 한 권 도착해요.',
  },
  {
    n: 3,
    title: '듣고 따라 읽기',
    body: '문장별 낭독과 한글 번역이 함께 나와 혼자서도 쉽게 읽어요.',
  },
  {
    n: 4,
    title: '퀴즈로 마무리',
    body: '읽은 내용 퀴즈와 단어 복습으로 오늘 읽기를 똑똑하게 닫아요.',
  },
];

const features = [
  {
    title: '매일 새 이야기',
    body: '같은 책을 반복하지 않아요. AI가 아이 레벨과 관심사를 살펴 오늘 읽을 새 이야기를 만들어 줍니다.',
    icon: (
      <svg viewBox="0 0 48 48" fill="none" aria-hidden="true">
        <path
          d="M8 12c0-2 1.5-3 3.5-3H22v28H11.5C9.5 37 8 36 8 34V12Z"
          fill="oklch(0.86 0.1 84)"
          stroke="oklch(0.35 0.08 62)"
          strokeWidth="2.2"
        />
        <path
          d="M40 12c0-2-1.5-3-3.5-3H26v28h10.5c2 0 3.5-1 3.5-3V12Z"
          fill="oklch(0.88 0.08 42)"
          stroke="oklch(0.35 0.08 62)"
          strokeWidth="2.2"
        />
        <path d="M24 9v28" stroke="oklch(0.35 0.08 62)" strokeWidth="2.2" strokeLinecap="round" />
        <path
          d="M13 17h6M13 22h6M13 27h5"
          stroke="oklch(0.45 0.1 62)"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
        <path
          d="M29 17h6M29 22h6M29 27h5"
          stroke="oklch(0.45 0.08 42)"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    title: '문장별 낭독',
    body: '자연스러운 원어민 음성과 함께 문장을 하나씩 읽어요. 발음 따라 읽기가 쉬워집니다.',
    icon: (
      <svg viewBox="0 0 48 48" fill="none" aria-hidden="true">
        <path
          d="M9 19h7l9-7v24l-9-7H9a2 2 0 0 1-2-2v-6a2 2 0 0 1 2-2Z"
          fill="oklch(0.86 0.1 235)"
          stroke="oklch(0.32 0.1 238)"
          strokeWidth="2.2"
          strokeLinejoin="round"
        />
        <path
          d="M32 18c2 2 2 10 0 12M37 14c4 4 4 16 0 20"
          stroke="oklch(0.32 0.1 238)"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    title: '퀴즈와 단어장',
    body: '읽은 책 이해도 퀴즈와 내 단어장으로 복습. 보호자 리포트로 성장이 한눈에 보여요.',
    icon: (
      <svg viewBox="0 0 48 48" fill="none" aria-hidden="true">
        <path
          d="M24 6 28.5 17 40 18l-9 7.5L34 37l-10-6-10 6 3-11.5L8 18l11.5-1L24 6Z"
          fill="oklch(0.86 0.1 160)"
          stroke="oklch(0.32 0.09 160)"
          strokeWidth="2.2"
          strokeLinejoin="round"
        />
        <path
          d="M20 22.5 23 25.5 28.5 20"
          stroke="oklch(0.3 0.1 160)"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
];

const books = [
  {
    title: 'The Sleepy Moon',
    meta: '나이 5~6세 · Level A1',
    image: '/images/landing/cover-sleepy-moon.png',
    alt: '잠든 달과 언덕 마을이 담긴 영어 동화 표지',
  },
  {
    title: 'Balloon Over Hills',
    meta: '나이 7~8세 · Level A2',
    image: '/images/landing/cover-balloon-hills.png',
    alt: '푸른 언덕 위 열기구가 떠 있는 영어 동화 표지',
  },
  {
    title: 'Little Fox Castle',
    meta: '나이 6~7세 · Level A1+',
    image: '/images/landing/cover-fox-castle.png',
    alt: '성 앞의 작은 여우가 손짓하는 영어 동화 표지',
  },
];

export function LandingPage() {
  return (
    <>
      <AppHeader variant="landing" />
      <div className="landing-scope">
        <main>
        <section className="page hero" aria-labelledby="hero-title">
          <div>
            <p className="hero-sticker">우리 아이에게 꼭 맞는 한 권</p>
            <h1 id="hero-title">
              오늘도 우리 아이에게
              <br />
              <span className="accent-gold">영어책</span>이
              <br />
              <span className="accent-sky">도착했어요.</span>
            </h1>
            <p className="hero-copy">
              하루책은 아이의 나이와 영어 레벨, 좋아하는 이야기를 살펴서 매일 딱 한 권의 동화를
              만들어 드려요. 문장별 낭독과 퀴즈까지 이어져, 혼자서도 즐겁게 읽는 리딩 루틴이
              자리 잡습니다.
            </p>
            <div className="cta-row">
              {/* 신규 사용자 진입점 — 문구("무료로 시작")와 행동(회원가입)을 일치시킨다. */}
              <a className="button button-primary" href="/signup?callbackUrl=%2F">
                무료로 시작하기
              </a>
              <a className="button button-ghost" href="#how">
                어떻게 쓰나요?
              </a>
            </div>
            <div className="hero-tags" aria-label="대상">
              <span>#5~10세</span>
              <span>#영어 레벨 A1~B2</span>
              <span>#보호자 리포트</span>
            </div>
          </div>

          <div className="hero-scene" aria-label="아이가 영어책을 읽는 일러스트">
            <Image
              src="/images/landing/hero-storybook.png"
              alt=""
              fill
              priority
              sizes="(min-width: 960px) 45vw, min(520px, 100vw)"
              className="object-cover"
            />
          </div>
        </section>

        <section id="how" className="page section" aria-labelledby="how-title">
          <div className="section-head">
            <p className="section-eyebrow">How it works</p>
            <h2 id="how-title">네 걸음이면, 오늘 읽기 끝!</h2>
            <p>복잡한 설정 없이 아이 프로필만 있으면 매일 새 책이 준비됩니다.</p>
          </div>
          <div className="steps">
            {steps.map((step) => (
              <article key={step.n} className="step">
                <span className="step-number" aria-hidden="true">
                  {step.n}
                </span>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="books" className="page section" aria-labelledby="books-title">
          <div className="section-head">
            <p className="section-eyebrow">Today&apos;s bookshelf</p>
            <h2 id="books-title">오늘은 어떤 이야기가 도착할까요?</h2>
            <p>아이 취향에 맞춰 매일 새로운 표지와 이야기가 열립니다.</p>
          </div>
          <div className="books">
            {books.map((book) => (
              <article key={book.title} className="book">
                <div className="book-cover">
                  <Image
                    src={book.image}
                    alt={book.alt}
                    fill
                    sizes="(min-width: 960px) 31vw, (min-width: 620px) 45vw, 100vw"
                    className="object-cover"
                  />
                </div>
                <div className="book-meta">
                  <strong>{book.title}</strong>
                  <span>{book.meta}</span>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section id="features" className="page section" aria-labelledby="features-title">
          <div className="section-head">
            <p className="section-eyebrow">Why parents love it</p>
            <h2 id="features-title">읽기, 듣기, 복습까지 한 번에</h2>
            <p>아이는 즐겁게 몰입하고, 보호자는 옆에서 성장을 지켜봅니다.</p>
          </div>
          <div className="features">
            {features.map((feature) => (
              <article key={feature.title} className="feature">
                <span className="feature-icon" aria-hidden="true">
                  {feature.icon}
                </span>
                <h3>{feature.title}</h3>
                <p>{feature.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="page final" aria-labelledby="final-title">
          <h2 id="final-title">오늘부터, 우리 아이의 영어책장을 매일 채워 주세요</h2>
          <p>가입하면 첫 동화 한 권을 무료로 선물해 드려요. 아이 이름만 알려주면 오늘 읽을 이야기가 바로 준비됩니다.</p>
          {/* 최하단 최종 CTA도 신규 사용자 진입점(/signup)으로 통일. */}
          <a className="button button-primary" href="/signup?callbackUrl=%2F">
            하루책 시작하기
          </a>
        </section>
      </main>

      </div>
      {/* 사업자 정보·약관 4종 링크는 SiteFooter가 일괄 노출. 랜딩 전용 한 줄
          카피본은 전자상거래법 §10이 요구하는 항목을 모두 채우지 못해 교체.
          .landing-scope 안의 .footer 셀렉터(globals.css)는 더 이상 매칭되지
          않지만, 향후 랜딩 영역 안에서 별도 카피가 필요할 때 재사용 가능하도록
          스타일 정의는 그대로 둔다. */}
      <SiteFooter />
    </>
  );
}
