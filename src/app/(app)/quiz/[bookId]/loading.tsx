import { Skeleton } from "@/components/ui/skeleton";

/**
 * 퀴즈 진입 fallback — main 셸만 그린다. SiteHeader는 (app)/layout.tsx가 보유해
 * 페이지 이동 사이에도 그대로 유지되므로 폴백에서 별도 헤더를 그릴 필요가 없다(2026-04-27).
 * 그림책 세계 퀴즈(2026-09-30)와 같은 좌표: 상단 줄 → 곰 + 말풍선 → 선택지 4장.
 */
export default function QuizLoading() {
  return (
    <main
      role="status"
      aria-busy="true"
      aria-label="퀴즈 준비 중"
      className="mx-auto w-full max-w-[592px] px-4 pt-3"
    >
      {/* 상단 줄 — 닫기 / 표지·제목 / 진행 동그라미 */}
      <div className="flex min-h-11 items-center gap-2.5">
        <Skeleton className="size-10 rounded-full bg-white/70" />
        <Skeleton className="h-[34px] w-[26px] rounded-sm bg-white/70" />
        <Skeleton className="h-4 flex-1 rounded-full bg-white/70" />
        <Skeleton className="h-[22px] w-32 rounded-full bg-white/70" />
      </div>

      {/* 곰 + 말풍선 자리 */}
      <div className="flex items-end gap-2 pt-5">
        <Skeleton className="size-[88px] shrink-0 rounded-full bg-white/60 sm:size-[104px]" />
        <Skeleton className="mb-[26px] h-28 flex-1 rounded-[20px] bg-white/80" />
      </div>

      {/* 4지선다 */}
      <div className="mt-3.5 grid gap-3.5">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-[62px] w-full rounded-[20px] bg-haru-paper/80" />
        ))}
      </div>
    </main>
  );
}
