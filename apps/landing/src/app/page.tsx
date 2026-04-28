import type { Metadata } from 'next';

export const dynamic = 'force-static';
export const revalidate = 60;

export const metadata: Metadata = {
  title: '하루책 | AI가 매일 만드는 아이 맞춤 영어 동화',
};

const steps = [
  {
    n: 1,
    title: '아이 프로필',
    body: '이름, 나이, 영어 레벨, 좋아하는 이야기 소재를 살짝 알려주세요.',
  },
  {
    n: 2,
    title: '오늘의 동화',
    body: '아이에게 딱 맞는 새 영어 동화를 AI가 매일 한 권 만들어 드려요.',
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
    body: '같은 책을 반복하지 않아요. 아이 레벨과 관심사에 맞춰 오늘 읽을 이야기가 열립니다.',
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
    palette: { sky: 'oklch(0.82 0.08 260)', accent: 'oklch(0.94 0.11 88)' },
    art: (
      <svg viewBox="0 0 240 320" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <defs>
          <linearGradient id="cover1" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="oklch(0.68 0.1 260)" />
            <stop offset="100%" stopColor="oklch(0.38 0.09 270)" />
          </linearGradient>
        </defs>
        <rect width="240" height="320" fill="url(#cover1)" />
        <circle cx="90" cy="95" r="42" fill="oklch(0.94 0.11 88)" />
        <circle cx="80" cy="88" r="12" fill="oklch(0.68 0.1 260)" opacity="0.35" />
        <circle cx="100" cy="105" r="8" fill="oklch(0.68 0.1 260)" opacity="0.35" />
        <g fill="oklch(0.96 0.08 88)">
          <circle cx="40" cy="50" r="2.2" />
          <circle cx="180" cy="60" r="3" />
          <circle cx="200" cy="120" r="1.8" />
          <circle cx="160" cy="180" r="2" />
          <circle cx="55" cy="190" r="2.5" />
        </g>
        <path
          d="M20 250c60-18 140-18 200 0v70H20Z"
          fill="oklch(0.55 0.09 275)"
          opacity="0.85"
        />
        <path
          d="M0 270c50-14 150-14 240 0v50H0Z"
          fill="oklch(0.48 0.08 275)"
        />
      </svg>
    ),
  },
  {
    title: 'Balloon Over Hills',
    meta: '나이 7~8세 · Level A2',
    palette: { sky: 'oklch(0.9 0.06 82)', accent: 'oklch(0.78 0.15 25)' },
    art: (
      <svg viewBox="0 0 240 320" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <defs>
          <linearGradient id="cover2" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="oklch(0.92 0.06 82)" />
            <stop offset="100%" stopColor="oklch(0.85 0.09 40)" />
          </linearGradient>
        </defs>
        <rect width="240" height="320" fill="url(#cover2)" />
        <g transform="translate(0,6)">
          <ellipse cx="140" cy="120" rx="48" ry="56" fill="oklch(0.78 0.15 25)" />
          <path d="M110 120a30 50 0 0 1 60 0Z" fill="oklch(0.88 0.1 85)" opacity="0.6" />
          <path d="M140 176v18" stroke="oklch(0.35 0.06 40)" strokeWidth="2.2" />
          <rect
            x="130"
            y="194"
            width="20"
            height="14"
            rx="2"
            fill="oklch(0.55 0.08 60)"
            stroke="oklch(0.3 0.06 40)"
            strokeWidth="2"
          />
        </g>
        <g fill="oklch(1 0 0)" opacity="0.85">
          <ellipse cx="55" cy="80" rx="22" ry="10" />
          <ellipse cx="75" cy="72" rx="16" ry="8" />
          <ellipse cx="190" cy="50" rx="18" ry="8" />
        </g>
        <path
          d="M0 230c55-30 100 20 160-5s80 5 80 5v90H0Z"
          fill="oklch(0.74 0.13 140)"
        />
        <path
          d="M0 260c50-20 100 15 170-5s70 5 70 5v60H0Z"
          fill="oklch(0.64 0.13 145)"
        />
      </svg>
    ),
  },
  {
    title: 'Little Fox Castle',
    meta: '나이 6~7세 · Level A1+',
    palette: { sky: 'oklch(0.88 0.07 160)', accent: 'oklch(0.78 0.14 60)' },
    art: (
      <svg viewBox="0 0 240 320" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <defs>
          <linearGradient id="cover3" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="oklch(0.88 0.07 200)" />
            <stop offset="100%" stopColor="oklch(0.82 0.09 160)" />
          </linearGradient>
        </defs>
        <rect width="240" height="320" fill="url(#cover3)" />
        <g transform="translate(32,60)">
          <rect x="20" y="60" width="140" height="120" fill="oklch(0.82 0.05 60)" />
          <rect x="0" y="40" width="40" height="140" fill="oklch(0.78 0.07 60)" />
          <rect x="140" y="40" width="40" height="140" fill="oklch(0.78 0.07 60)" />
          <polygon points="0,40 20,10 40,40" fill="oklch(0.65 0.14 25)" />
          <polygon points="140,40 160,10 180,40" fill="oklch(0.65 0.14 25)" />
          <polygon points="50,60 90,20 130,60" fill="oklch(0.62 0.16 25)" />
          <rect x="78" y="100" width="24" height="40" fill="oklch(0.35 0.06 60)" rx="12" />
          <rect x="8" y="80" width="18" height="22" fill="oklch(0.35 0.06 60)" rx="4" />
          <rect x="154" y="80" width="18" height="22" fill="oklch(0.35 0.06 60)" rx="4" />
        </g>
        <circle cx="205" cy="62" r="24" fill="oklch(0.94 0.11 88)" opacity="0.9" />
        <path
          d="M0 258c60-14 120-14 240 0v62H0Z"
          fill="oklch(0.7 0.13 150)"
        />
      </svg>
    ),
  },
];

function HeroScene() {
  return (
    <svg viewBox="0 0 520 540" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
      {/* 바닥 선 */}
      <path
        d="M20 470h480"
        stroke="oklch(0.78 0.04 82)"
        strokeWidth="2"
        strokeDasharray="2 6"
        strokeLinecap="round"
      />

      {/* 배경 점 + 반짝 */}
      <g fill="oklch(0.82 0.06 82)">
        <circle cx="60" cy="70" r="3.5" />
        <circle cx="450" cy="100" r="2.5" />
        <circle cx="80" cy="260" r="2" />
        <circle cx="490" cy="300" r="3" />
      </g>
      <g stroke="oklch(0.62 0.14 60)" strokeWidth="2" strokeLinecap="round">
        <path d="M100 140l0 14M93 147l14 0" />
        <path d="M430 210l0 14M423 217l14 0" />
        <path d="M58 380l0 12M52 386l12 0" />
      </g>

      {/* 구름 */}
      <g fill="oklch(1 0 0)" opacity="0.85">
        <ellipse cx="100" cy="90" rx="34" ry="14" />
        <ellipse cx="118" cy="82" rx="22" ry="11" />
        <ellipse cx="410" cy="70" rx="30" ry="13" />
      </g>

      {/* 별/달 */}
      <circle cx="405" cy="140" r="42" fill="oklch(0.95 0.1 88)" />
      <circle cx="392" cy="132" r="12" fill="oklch(0.82 0.14 85)" opacity="0.45" />
      <path
        d="M370 260l6 14 15 1-11 10 3 15-13-8-13 8 3-15-11-10 15-1Z"
        fill="oklch(0.72 0.18 25)"
        stroke="oklch(0.42 0.16 25)"
        strokeWidth="2"
        strokeLinejoin="round"
      />

      {/* 풍선 */}
      <g transform="translate(70,135)">
        <ellipse cx="60" cy="70" rx="52" ry="60" fill="oklch(0.78 0.15 25)" />
        <path d="M28 70a32 54 0 0 1 64 0Z" fill="oklch(0.88 0.1 85)" opacity="0.55" />
        <path d="M60 130v26" stroke="oklch(0.35 0.1 25)" strokeWidth="2.4" />
        <rect
          x="47"
          y="156"
          width="26"
          height="18"
          rx="3"
          fill="oklch(0.55 0.08 60)"
          stroke="oklch(0.3 0.06 40)"
          strokeWidth="2"
        />
      </g>

      {/* 메인 책 (열린 책) */}
      <g transform="translate(130,310)">
        <path
          d="M0 20C30 6 110 4 130 20V150C110 136 30 134 0 150V20Z"
          fill="oklch(0.95 0.06 82)"
          stroke="oklch(0.32 0.05 260)"
          strokeWidth="3"
          strokeLinejoin="round"
        />
        <path
          d="M130 20C150 6 230 4 260 20V150C230 136 150 134 130 150V20Z"
          fill="oklch(0.92 0.08 235)"
          stroke="oklch(0.32 0.05 260)"
          strokeWidth="3"
          strokeLinejoin="round"
        />
        <path d="M130 20V150" stroke="oklch(0.32 0.05 260)" strokeWidth="3" />
        <path
          d="M18 42h90M18 58h80M18 74h90M18 90h70"
          stroke="oklch(0.55 0.08 60)"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d="M148 42h90M148 58h80M148 74h90M148 90h70"
          stroke="oklch(0.4 0.09 238)"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </g>

      {/* 말풍선 */}
      <g transform="translate(310,200)">
        <path
          d="M8 14c0-6 4-10 10-10h132c6 0 10 4 10 10v48c0 6-4 10-10 10H60l-18 18 4-18H18c-6 0-10-4-10-10V14Z"
          fill="oklch(0.98 0.02 82)"
          stroke="oklch(0.45 0.12 30)"
          strokeWidth="2.4"
          strokeLinejoin="round"
        />
        <text
          x="84"
          y="48"
          fill="oklch(0.35 0.1 30)"
          fontFamily="AtoZ, sans-serif"
          fontWeight="900"
          fontSize="22"
          textAnchor="middle"
        >
          Hi, friend!
        </text>
      </g>

      {/* 여우 캐릭터 (귀여운 원형 얼굴) */}
      <g transform="translate(260,360)">
        <ellipse cx="60" cy="80" rx="52" ry="48" fill="oklch(0.78 0.14 60)" />
        <path d="M20 52l-10-24 24 10Z" fill="oklch(0.78 0.14 60)" />
        <path d="M100 52l10-24-24 10Z" fill="oklch(0.78 0.14 60)" />
        <ellipse cx="60" cy="92" rx="36" ry="26" fill="oklch(0.95 0.03 82)" />
        <circle cx="44" cy="76" r="4" fill="oklch(0.22 0.05 60)" />
        <circle cx="76" cy="76" r="4" fill="oklch(0.22 0.05 60)" />
        <circle cx="60" cy="94" r="4" fill="oklch(0.22 0.05 60)" />
        <path
          d="M52 102c3 4 13 4 16 0"
          stroke="oklch(0.22 0.05 60)"
          strokeWidth="2.4"
          strokeLinecap="round"
          fill="none"
        />
        <circle cx="30" cy="94" r="5" fill="oklch(0.82 0.12 25)" opacity="0.6" />
        <circle cx="90" cy="94" r="5" fill="oklch(0.82 0.12 25)" opacity="0.6" />
      </g>
    </svg>
  );
}

export default function LandingPage() {
  return (
    <>
      <header className="page nav" aria-label="주요 메뉴">
        <a className="brand" href="/" aria-label="하루책 홈">
          <span className="brand-mark" aria-hidden="true">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/book_icon.png" alt="" width={30} height={30} />
          </span>
          <span>하루책</span>
        </a>
        <nav className="nav-links" aria-label="랜딩 메뉴">
          <a href="#how">이용 방법</a>
          <a href="#books">오늘의 책</a>
          <a href="#features">기능</a>
          <a className="button button-primary" href="/login?callbackUrl=%2Fapp">
            앱 시작하기
          </a>
        </nav>
      </header>

      <main>
        <section className="page hero" aria-labelledby="hero-title">
          <div>
            <p className="hero-sticker">매일 아침, 새 영어책 한 권</p>
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
              <a className="button button-primary" href="/signup?callbackUrl=%2Fapp">
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
            <HeroScene />
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
                <div className="book-cover">{book.art}</div>
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
          <p>첫 책은 무료예요. 아이 이름만 알려주면 바로 오늘 읽을 이야기가 준비됩니다.</p>
          {/* 최하단 최종 CTA도 신규 사용자 진입점(/signup)으로 통일. */}
          <a className="button button-primary" href="/signup?callbackUrl=%2Fapp">
            하루책 시작하기
          </a>
        </section>
      </main>

      <footer className="page footer">
        <span>© 하루책 · AI 영어 리딩 루틴 · hwgiai</span>
      </footer>
    </>
  );
}
