import { Skeleton } from "@/components/ui/skeleton";

/**
 * 책 상세(reader) 진입 fallback — main 셸만 그린다. SiteHeader는 (app)/layout.tsx가
 * 보유해 페이지 이동 사이에도 그대로 유지되므로 폴백에서 별도 헤더를 그릴 필요가
 * 없다(2026-04-27). Reader가 client 컴포넌트라 RSC 페이로드 도착까지 빈 시간이
 * 가장 길지만, 사이트 헤더는 layout이 들고 있어 brand 좌표가 안정적.
 */
export default function BookLoading() {
  return (
    <main
      role="status"
      aria-busy="true"
      aria-label="책 펼치는 중"
      className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6"
    >
      {/* 진도 / 설정 자리 — 백 링크는 사이트 헤더가 흡수 */}
      <div className="mb-6 flex items-center justify-end gap-3">
        <Skeleton className="h-2 w-40 rounded-full" />
        <Skeleton className="h-9 w-9 rounded-full" />
      </div>

      {/* 표지 + 메타 영역 */}
      <div className="rounded-3xl border border-border bg-card/80 p-6 shadow-sm">
        <div className="flex flex-col items-center gap-5">
          <Skeleton className="h-7 w-2/3 rounded-full" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-6 w-12 rounded-full" />
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
          <Skeleton className="aspect-[4/3] w-full max-w-md rounded-2xl" />
        </div>
      </div>

      {/* 본문 카드 — 문장 라인 5줄 */}
      <div className="mt-6 rounded-3xl border border-border bg-card/80 p-6 shadow-sm sm:p-8">
        <div className="space-y-4">
          <Skeleton className="h-5 w-full rounded-full" />
          <Skeleton className="h-5 w-11/12 rounded-full" />
          <Skeleton className="h-5 w-10/12 rounded-full" />
          <Skeleton className="h-5 w-full rounded-full" />
          <Skeleton className="h-5 w-9/12 rounded-full" />
        </div>

        {/* 컨트롤 row — 이전/재생/다음 */}
        <div className="mt-8 flex items-center justify-center gap-3">
          <Skeleton className="h-11 w-11 rounded-full" />
          <Skeleton className="h-12 w-32 rounded-full" />
          <Skeleton className="h-11 w-11 rounded-full" />
        </div>
      </div>
    </main>
  );
}
