import { auth } from '@/auth';
import { Bookshelf } from '@/components/bookshelf';
import { LandingPage } from '@/components/landing/landing-page';
import { LearningSummary } from '@/components/learning-summary';
import { UpgradeBanner } from '@/components/subscribe/upgrade-banner';

/**
 * 루트(/) — 동일 URL에서 인증 여부에 따라 랜딩(LP) 또는 책장을 server-render한다.
 *
 * - 비로그인 → <LandingPage/> (자체 landing 헤더). (app)/layout.tsx의 SiteHeader는
 *   비로그인일 때 server에서 null 처리되므로 헤더가 중복되지 않는다.
 * - 로그인  → 기존 책장(Bookshelf + LearningSummary + UpgradeBanner). SiteHeader는
 *   상위 (app)/layout.tsx가 보유해 페이지 이동 사이에도 마운트가 유지된다.
 */
export default async function Home() {
  const session = await auth();
  if (!session?.user) {
    return <LandingPage />;
  }

  return (
    <main className="mx-auto w-full max-w-6xl space-y-6 px-4 pb-24 pt-6 sm:px-6">
      {/* 별 보유 여부와 무관하게 추가 충전 CTA를 항상 노출한다. */}
      <UpgradeBanner />

      <LearningSummary />

      <div id="bookshelf">
        <Bookshelf />
      </div>
    </main>
  );
}
