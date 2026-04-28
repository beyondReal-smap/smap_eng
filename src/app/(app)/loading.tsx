import { Skeleton } from '@/components/ui/skeleton';
import { SkeletonGrid } from '@/components/bookshelf';

/**
 * 책장(/) 진입 fallback — `(app)/page.tsx`가 server에서 auth() 분기 후
 * RSC payload를 흘려주는 동안 보여줄 본문 골격.
 *
 * 헤더(`SiteHeader`)는 `(app)/layout.tsx`가 보유해 fallback 단계에도 유지된다.
 * 따라서 여기서는 본문(main) 셸만 그린다 — page.tsx와 동일한
 * `mx-auto max-w-6xl space-y-6 px-4 pb-24 pt-6` 컨테이너로 좌표를 맞춰
 * RSC 도착 시 layout shift가 발생하지 않도록 한다.
 *
 * 셸 구성(2026-04-27 피드백 — "데이터가 호로로록 채워지는" 두 단계 swap을 한 단계로 합침):
 *   1) UpgradeBanner 자리: 한 줄 pill 카드
 *   2) LearningSummary Hero: 인삿말 + 3 KPI + 이어 읽기 자리
 *   3) Bookshelf 헤더 카드: 타이틀/설명 + 검색바 + 레벨 필
 *   4) SkeletonGrid: Bookshelf 내부 fetch 중 스켈레톤과 동일 컴포넌트를 재사용해
 *      RSC 도착 → client fetch 진행으로 swap될 때 모양이 그대로 유지된다.
 *
 * 비로그인은 `(app)/page.tsx`가 `<LandingPage/>`를 반환해 LandingPage RSC가
 * 빠르게 그려지므로 이 fallback은 거의 노출되지 않는다 — 노출되더라도 빈 카드 셸은
 * landing 헤더 변경과 충돌 없는 중립 마크업.
 */
export default function AppHomeLoading() {
  return (
    <main
      role="status"
      aria-busy="true"
      aria-label="책장 여는 중"
      className="mx-auto w-full max-w-6xl space-y-6 px-4 pb-24 pt-6 sm:px-6"
    >
      {/* 1) UpgradeBanner 자리 */}
      <Skeleton className="h-14 w-full rounded-2xl" />

      {/* 2) Hero 카드 — page.tsx의 wrapper와 동일한 rounded-2xl border bg-card/60 */}
      <section className="rounded-2xl border border-border/60 bg-card/60 p-5 shadow-sm sm:p-6">
        <Skeleton className="h-6 w-48 rounded-full" />
        <Skeleton className="mt-3 h-4 w-72 max-w-full rounded-full" />
        <div className="mt-5 grid grid-cols-3 gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="rounded-xl border border-border/60 bg-card/80 p-3"
            >
              <Skeleton className="h-3 w-12 rounded-full" />
              <Skeleton className="mt-3 h-7 w-12 rounded-full" />
            </div>
          ))}
        </div>
        {/* 이어 읽기 카드 자리 */}
        <div className="mt-5 flex items-center gap-4 rounded-xl border border-border/60 bg-card/80 p-3">
          <Skeleton className="aspect-[5/3] w-28 shrink-0 rounded-lg" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-4 w-2/3 rounded-full" />
            <Skeleton className="h-3 w-1/2 rounded-full" />
            <Skeleton className="h-2 w-full rounded-full" />
          </div>
        </div>
      </section>

      {/* 3) Bookshelf 헤더 카드 — bookshelf.tsx 내부와 동일한 외곽 클래스 */}
      <div id="bookshelf" className="space-y-6">
        <header className="rounded-2xl border border-border/60 bg-card/60 p-5 shadow-sm sm:p-6">
          <Skeleton className="h-6 w-24 rounded-full" />
          <Skeleton className="mt-3 h-4 w-64 max-w-full rounded-full" />
          <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-border/60 pt-4">
            <Skeleton className="h-9 w-full max-w-[260px] rounded-md" />
            <Skeleton className="h-9 w-44 rounded-md" />
          </div>
        </header>

        {/* 4) Bookshelf 내부 fetch 단계와 동일한 컴포넌트 — swap 시 위치/모양 유지 */}
        <SkeletonGrid />
      </div>
    </main>
  );
}
