import { AuthHeader } from "@/components/auth/auth-header";
import { AuthRedirectGuard } from "@/components/auth/auth-redirect-guard";
import { SiteFooter } from "@/components/site-footer";

/**
 * 인증 라우트 그룹 레이아웃 — /login, /signup 공용.
 *
 * 톤: 랜딩(apps/landing)과 동일한 스토리북 감성.
 *   - warm paper + 파스텔 radial-gradient 3겹 배경
 *   - AtoZ 폰트 가중치 강조(heading font-extrabold)
 *   - 좌측 브랜드 패널: 여우+책+말풍선 SVG 일러스트(랜딩 HeroScene 축약)
 *   - Card(기본)의 sticker-shadow 스타일을 그대로 사용
 *
 * 랜딩→로그인 화면 전환에서 "분위기 스위치" 느낌을 없애는 것이 목표.
 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // 배경은 전역 body 배경(랜딩과 동일한 3겹 radial + 점 패턴)을 그대로 사용.
    // 이전에는 inline style로 배경을 한 번 더 덮었으나, 중복 렌더 + 미세 좌표 차이로
    // 랜딩과의 톤 일체감을 오히려 해쳤다. 투명 div로 두어 body가 그대로 비치게 함.
    //
    // SiteFooter는 사업자 정보/약관 노출용으로 헤더 wrapper와 같은 형제 위치에 둔다.
    // wrapper가 overflow-hidden이라 그 안에 두면 푸터가 잘릴 수 있어 밖으로 분리.
    <>
      <div className="relative min-h-dvh overflow-hidden">
        <AuthRedirectGuard />

        <AuthHeader />

        {/* 본문 — 2컬럼 스플릿. 컨테이너는 랜딩 `.page`와 동일 공식. */}
        <main className="mx-auto grid w-[min(1160px,calc(100%-36px))] grid-cols-1 gap-10 py-10 lg:grid-cols-[1.05fr_1fr] lg:gap-16 lg:py-16">
          <BrandPanel />
          <section className="flex items-start lg:items-center">
            <div className="mx-auto w-full max-w-md">{children}</div>
          </section>
        </main>
      </div>
      <SiteFooter />
    </>
  );
}

/**
 * 좌측 브랜드 스토리 패널(lg+).
 * 랜딩 히어로와 동일한 일러스트 세계관(여우·책·말풍선)으로
 * "하루책이 맞다"는 시각적 연속성을 준다.
 */
function BrandPanel() {
  return (
    <div className="hidden flex-col justify-center gap-6 lg:flex">
      <AuthHeroScene />

      <div className="space-y-3">
        <h1 className="font-heading text-4xl font-extrabold leading-[1.1] tracking-tight text-foreground">
          오늘 아이에게
          <br />
          어떤 이야기를 들려줄까요?
        </h1>
        <p className="text-base leading-relaxed text-muted-foreground">
          아이 연령과 영어 수준에 맞춘 동화를 AI가 매일 만들어 드려요. 낭독,
          한글 해석, 퀴즈, 단어장까지 한 곳에서.
        </p>
      </div>

      <ul className="flex flex-col gap-2 text-sm text-foreground/85">
        {[
          "CEFR A1~B2 · 5~10세 맞춤 레벨링",
          "문장별 TTS 낭독으로 발음 학습",
          "퀴즈 · 단어장 · 주간 리포트로 성장 확인",
        ].map((item) => (
          <li key={item} className="flex items-start gap-2">
            <span
              aria-hidden
              className="mt-1.5 inline-block size-1.5 shrink-0 rounded-full bg-primary"
            />
            <span>{item}</span>
          </li>
        ))}
      </ul>

      <p className="pt-2 text-xs font-medium text-muted-foreground">
        이미 <span className="text-foreground font-semibold">1,240</span>명의 가족이
        하루책과 함께 읽고 있어요.
      </p>
    </div>
  );
}

/**
 * 랜딩 `HeroScene`의 축약판. 좌측 패널 상단에 배치.
 * 여우 + 책(열린 2면) + 말풍선 + 별/달을 한 뷰포트 안에 담아
 * 랜딩에서 본 캐릭터와 동일함을 즉시 인지시킨다.
 */
function AuthHeroScene() {
  return (
    <div aria-hidden className="relative w-full max-w-sm">
      <svg
        viewBox="0 0 360 240"
        preserveAspectRatio="xMidYMid meet"
        className="h-auto w-full"
      >
        {/* 별/달 */}
        <circle cx="300" cy="50" r="26" fill="oklch(0.95 0.1 88)" />
        <circle cx="292" cy="44" r="7" fill="oklch(0.82 0.14 85)" opacity="0.45" />
        <g fill="oklch(0.82 0.06 82)">
          <circle cx="40" cy="40" r="2.5" />
          <circle cx="330" cy="120" r="2" />
          <circle cx="60" cy="170" r="2" />
        </g>
        <path
          d="M62 78l4 9 10 1-7 6 2 10-9-5-9 5 2-10-7-6 10-1Z"
          fill="oklch(0.72 0.18 25)"
          stroke="oklch(0.42 0.16 25)"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />

        {/* 열린 책 */}
        <g transform="translate(90,120)">
          <path
            d="M0 14C22 4 80 3 96 14V110C80 100 22 99 0 110V14Z"
            fill="oklch(0.95 0.06 82)"
            stroke="oklch(0.32 0.05 260)"
            strokeWidth="2.4"
            strokeLinejoin="round"
          />
          <path
            d="M96 14C112 4 170 3 192 14V110C170 100 112 99 96 110V14Z"
            fill="oklch(0.92 0.08 235)"
            stroke="oklch(0.32 0.05 260)"
            strokeWidth="2.4"
            strokeLinejoin="round"
          />
          <path d="M96 14V110" stroke="oklch(0.32 0.05 260)" strokeWidth="2.4" />
          <path
            d="M12 30h66M12 42h58M12 54h66"
            stroke="oklch(0.55 0.08 60)"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
          <path
            d="M108 30h66M108 42h58M108 54h66"
            stroke="oklch(0.4 0.09 238)"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </g>

        {/* 말풍선 */}
        <g transform="translate(200,20)">
          <path
            d="M6 12c0-5 3-8 8-8h100c5 0 8 3 8 8v36c0 5-3 8-8 8H46l-14 14 3-14H14c-5 0-8-3-8-8V12Z"
            fill="oklch(0.98 0.02 82)"
            stroke="oklch(0.45 0.12 30)"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <text
            x="64"
            y="36"
            fill="oklch(0.35 0.1 30)"
            fontFamily="AtoZ, sans-serif"
            fontWeight="900"
            fontSize="18"
            textAnchor="middle"
          >
            Hi, friend!
          </text>
        </g>

        {/* 여우 */}
        <g transform="translate(210,130)">
          <ellipse cx="50" cy="60" rx="42" ry="38" fill="oklch(0.78 0.14 60)" />
          <path d="M16 38l-8-18 20 8Z" fill="oklch(0.78 0.14 60)" />
          <path d="M84 38l8-18-20 8Z" fill="oklch(0.78 0.14 60)" />
          <ellipse cx="50" cy="70" rx="28" ry="20" fill="oklch(0.95 0.03 82)" />
          <circle cx="36" cy="56" r="3" fill="oklch(0.22 0.05 60)" />
          <circle cx="64" cy="56" r="3" fill="oklch(0.22 0.05 60)" />
          <circle cx="50" cy="72" r="3" fill="oklch(0.22 0.05 60)" />
          <path
            d="M44 80c2 3 10 3 12 0"
            stroke="oklch(0.22 0.05 60)"
            strokeWidth="2"
            strokeLinecap="round"
            fill="none"
          />
          <circle cx="24" cy="72" r="4" fill="oklch(0.82 0.12 25)" opacity="0.6" />
          <circle cx="76" cy="72" r="4" fill="oklch(0.82 0.12 25)" opacity="0.6" />
        </g>
      </svg>
    </div>
  );
}
