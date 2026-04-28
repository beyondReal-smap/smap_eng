import { Skeleton } from "@/components/ui/skeleton";

/**
 * 통계 fallback — main 셸만 그린다. SiteHeader는 (app)/layout.tsx가 보유해
 * 페이지 이동 사이에도 그대로 유지되므로 폴백에서 별도 헤더를 그릴 필요가 없다(2026-04-27).
 */
export default function StatsLoading() {
  return (
    <main
      role="status"
      aria-busy="true"
      aria-label="통계 모으는 중"
      className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6"
    >
      <header className="mb-6">
        <Skeleton className="h-8 w-40 rounded-full" />
        <Skeleton className="mt-2 h-4 w-72 max-w-full rounded-full" />
      </header>

      {/* KPI 4분할 */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div
            key={i}
            className="rounded-2xl border border-border bg-card/80 p-4 shadow-sm"
          >
            <Skeleton className="h-3 w-16 rounded-full" />
            <Skeleton className="mt-3 h-7 w-12 rounded-full" />
          </div>
        ))}
      </div>

      {/* 차트/리스트 카드 */}
      <div className="mt-6 rounded-3xl border border-border bg-card/80 p-6 shadow-sm">
        <Skeleton className="h-5 w-32 rounded-full" />
        <Skeleton className="mt-5 h-40 w-full rounded-2xl" />
        <div className="mt-5 space-y-3">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-xl" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4 rounded-full" />
                <Skeleton className="h-3 w-1/2 rounded-full" />
              </div>
              <Skeleton className="h-5 w-12 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
