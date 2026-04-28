import { Skeleton } from "@/components/ui/skeleton";

/**
 * 보호자 모드 fallback — main 셸만 그린다. SiteHeader는 (app)/layout.tsx가 보유해
 * 페이지 이동 사이에도 그대로 유지되므로 폴백에서 별도 헤더를 그릴 필요가 없다(2026-04-27).
 */
export default function ParentsLoading() {
  return (
    <main
      role="status"
      aria-busy="true"
      aria-label="보호자 영역 여는 중"
      className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6"
    >
      <header className="mb-6">
        <Skeleton className="h-8 w-32 rounded-full" />
        <Skeleton className="mt-2 h-4 w-72 max-w-full rounded-full" />
      </header>

      <div className="rounded-3xl border border-border bg-card/80 p-6 shadow-sm sm:p-8">
        <Skeleton className="h-5 w-40 rounded-full" />
        <div className="mt-5 grid grid-cols-3 gap-2">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="aspect-square rounded-xl" />
          ))}
        </div>
        <Skeleton className="mt-6 h-11 w-full rounded-full" />
      </div>
    </main>
  );
}
