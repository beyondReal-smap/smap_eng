import { Skeleton } from "@/components/ui/skeleton";

/**
 * 퀴즈 진입 fallback — main 셸만 그린다. SiteHeader는 (app)/layout.tsx가 보유해
 * 페이지 이동 사이에도 그대로 유지되므로 폴백에서 별도 헤더를 그릴 필요가 없다(2026-04-27).
 */
export default function QuizLoading() {
  return (
    <main
      role="status"
      aria-busy="true"
      aria-label="퀴즈 준비 중"
      className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6"
    >
      {/* 점수 헤더 — 책 제목 / 진도 / 점수 자리 */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex-1">
          <Skeleton className="h-6 w-2/3 rounded-full" />
          <Skeleton className="mt-2 h-3 w-1/3 rounded-full" />
        </div>
        <Skeleton className="h-12 w-20 rounded-2xl" />
      </div>

      {/* 진도 바 */}
      <Skeleton className="mt-4 h-2 w-full rounded-full" />

      {/* 문제 카드 */}
      <div className="mt-6 rounded-3xl border border-border bg-card/80 p-6 shadow-sm sm:p-8">
        <Skeleton className="h-4 w-20 rounded-full" />
        <div className="mt-3 space-y-2">
          <Skeleton className="h-6 w-full rounded-full" />
          <Skeleton className="h-6 w-9/12 rounded-full" />
        </div>

        {/* 4지선다 */}
        <div className="mt-6 grid gap-3">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-2xl" />
          ))}
        </div>
      </div>
    </main>
  );
}
