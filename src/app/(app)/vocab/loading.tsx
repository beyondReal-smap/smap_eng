import { Skeleton } from "@/components/ui/skeleton";

/**
 * 단어장 fallback — main 셸만 그린다. SiteHeader는 (app)/layout.tsx가 보유해
 * 페이지 이동 사이에도 그대로 유지되므로 폴백에서 별도 헤더를 그릴 필요가 없다(2026-04-27).
 */
export default function VocabLoading() {
  return (
    <main
      role="status"
      aria-busy="true"
      aria-label="단어장 여는 중"
      className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6"
    >
      <header className="mb-6">
        <Skeleton className="h-8 w-40 rounded-full" />
        <Skeleton className="mt-2 h-4 w-64 max-w-full rounded-full" />
      </header>

      {/* 진도 바 */}
      <Skeleton className="h-2 w-full rounded-full" />

      {/* 플래시카드 */}
      <div className="mt-6 rounded-3xl border border-border bg-card/80 p-8 shadow-sm">
        <div className="flex flex-col items-center gap-4">
          <Skeleton className="h-3 w-24 rounded-full" />
          <Skeleton className="h-10 w-2/3 rounded-full" />
          <Skeleton className="h-9 w-9 rounded-full" />
          <Skeleton className="h-4 w-1/2 rounded-full" />
        </div>

        <div className="mt-8 flex items-center justify-center gap-3">
          <Skeleton className="h-11 w-28 rounded-full" />
          <Skeleton className="h-11 w-28 rounded-full" />
        </div>
      </div>
    </main>
  );
}
