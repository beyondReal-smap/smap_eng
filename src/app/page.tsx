import { Bookshelf } from '@/components/bookshelf';
import { ProfileSwitcher } from '@/components/profile-switcher';

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl px-4 pb-24 pt-4 sm:px-6">
        <Hero />
        <LevelGuide />
        <section className="mt-10 animate-fade-up">
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
                우리 아이 책장
              </h2>
              <p className="text-sm text-muted-foreground">
                오늘은 어떤 이야기를 만나볼까요?
              </p>
            </div>
          </div>
          <Bookshelf />
        </section>
      </main>
    </>
  );
}

function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/70 backdrop-blur-md supports-[backdrop-filter]:bg-background/50">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <a href="/" className="flex items-center gap-2 group">
          <span
            aria-hidden
            className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm group-hover:animate-wiggle-slow"
          >
            <LogoMark />
          </span>
          <span className="flex flex-col leading-tight">
            <span className="text-base font-extrabold tracking-tight">
              smap<span className="text-primary">.</span>eng
            </span>
            <span className="text-[11px] text-muted-foreground">
              AI 영어 동화책
            </span>
          </span>
        </a>
        <ProfileSwitcher />
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative mt-6 overflow-hidden rounded-3xl border border-border/60 bg-card/70 px-6 py-10 shadow-sm glass-card animate-pop-in sm:px-10 sm:py-14">
      {/* 배경 장식 */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-[color:var(--accent)] opacity-50 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -left-16 bottom-0 h-56 w-56 rounded-full bg-[color:var(--secondary)] opacity-60 blur-3xl"
      />

      <div className="relative flex flex-col items-start gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="max-w-xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse-ring" />
            오늘의 추천 레벨 · A1
          </span>
          <h1 className="mt-4 text-4xl font-black leading-tight tracking-tight sm:text-5xl">
            아이와 함께 읽는
            <br className="hidden sm:block" />
            <span className="bg-gradient-to-r from-[color:var(--primary)] via-[color:var(--chart-4)] to-[color:var(--accent)] bg-clip-text text-transparent">
              AI 영어 동화
            </span>
          </h1>
          <p className="mt-4 text-base text-muted-foreground sm:text-lg">
            연령과 CEFR 레벨에 맞춰 AI가 동화책을 만들어 드려요.
            문장별 낭독과 한글 해석, 마지막엔 4지선다 퀴즈까지.
          </p>
        </div>

        <FloatingBooks />
      </div>
    </section>
  );
}

function FloatingBooks() {
  const books = [
    { emoji: '📕', color: 'var(--level-b1)', delay: '0s' },
    { emoji: '📗', color: 'var(--level-a1)', delay: '0.6s' },
    { emoji: '📘', color: 'var(--accent)', delay: '1.2s' },
    { emoji: '📙', color: 'var(--level-a2)', delay: '1.8s' },
  ];
  return (
    <div className="relative grid grid-cols-2 gap-3 sm:gap-4" aria-hidden>
      {books.map((b, i) => (
        <div
          key={i}
          className="flex h-20 w-20 items-center justify-center rounded-2xl shadow-sm sm:h-24 sm:w-24 animate-float-soft"
          style={{
            background: `color-mix(in oklch, ${b.color} 70%, white)`,
            animationDelay: b.delay,
          }}
        >
          <span className="text-4xl sm:text-5xl">{b.emoji}</span>
        </div>
      ))}
    </div>
  );
}

function LogoMark() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M3 4.5C3 3.67 3.67 3 4.5 3h6A4.5 4.5 0 0 1 15 7.5V17l-3-1.5-2.5 1.5-2.5-1.5L3 17V4.5Z"
        fill="currentColor"
        opacity=".95"
      />
      <path
        d="M6.5 7.5h5M6.5 10h3"
        stroke="var(--primary)"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

function LevelGuide() {
  const rows = [
    {
      age: '5–6세',
      cefr: 'A1',
      badge: 'level-a1',
      desc: '4–7 단어 문장 · 현재형 기초 어휘',
    },
    {
      age: '7–8세',
      cefr: 'A1–A2',
      badge: 'level-a2',
      desc: '6–10 단어 · 과거형과 접속사',
    },
    {
      age: '9–10세',
      cefr: 'A2–B1',
      badge: 'level-b1',
      desc: '8–14 단어 · 관계절과 감정 표현',
    },
  ];
  return (
    <section className="mt-10 grid grid-cols-1 gap-3 sm:grid-cols-3">
      {rows.map((r, i) => (
        <div
          key={r.cefr}
          className="stagger-item rounded-2xl border border-border/60 bg-card/70 p-4 shadow-sm glass-card press-scale"
          style={{ animationDelay: `${80 + i * 70}ms` }}
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold">{r.age}</span>
            <span
              className={`${r.badge} rounded-full px-2.5 py-0.5 text-xs font-bold`}
            >
              {r.cefr}
            </span>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">{r.desc}</p>
        </div>
      ))}
    </section>
  );
}
