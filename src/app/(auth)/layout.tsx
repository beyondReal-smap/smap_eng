import Image from "next/image";

import { AuthHeader } from "@/components/auth/auth-header";
import { AuthRedirectGuard } from "@/components/auth/auth-redirect-guard";
import { SiteFooter } from "@/components/site-footer";

/**
 * 인증 라우트 그룹 레이아웃 — /login, /signup 공용.
 *
 * 톤: 랜딩(apps/landing)과 동일한 스토리북 감성.
 *   - warm paper + 파스텔 radial-gradient 3겹 배경
 *   - AtoZ 폰트 가중치 강조(heading font-extrabold)
 *   - 좌측 브랜드 패널: 생성형 스토리북 일러스트
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

        {/* 본문 — 2컬럼 스플릿. 컨테이너는 랜딩 `.page`와 동일 공식.
            모바일에서 좌우 padding 36px가 카드를 답답하게 만들어 16px로 축소.
            데스크톱(lg+)에서는 기존 36px 마진 유지. */}
        <main className="mx-auto grid w-[min(1160px,calc(100%-32px))] grid-cols-1 gap-10 py-6 sm:py-10 lg:w-[min(1160px,calc(100%-36px))] lg:grid-cols-[1.05fr_1fr] lg:gap-16 lg:py-16">
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

function AuthHeroScene() {
  return (
    <div
      aria-hidden
      className="relative aspect-[3/2] w-full max-w-sm overflow-hidden rounded-[2rem] border-2 border-border/40 shadow-[0_18px_40px_oklch(0.4_0.06_258_/_0.14)]"
    >
      <Image
        src="/images/landing/auth-storybook.png"
        alt=""
        fill
        priority
        sizes="384px"
        className="object-cover"
      />
    </div>
  );
}
