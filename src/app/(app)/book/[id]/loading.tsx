import { Skeleton } from "@/components/ui/skeleton";

/**
 * 책 상세(reader) 진입 fallback — main 셸만 그린다. SiteHeader는 (app)/layout.tsx가
 * 보유해 페이지 이동 사이에도 그대로 유지되므로 폴백에서 별도 헤더를 그릴 필요가
 * 없다(2026-04-27). 그림책 리더(2026-09-30)와 같은 "책 한 권" 무대 좌표 — 종이 위에
 * 표지 자리·제목·버튼 자리를 그려 도착 시 점프가 없게 한다.
 */
export default function BookLoading() {
  return (
    <main className="w-full md:px-6">
      <div
        role="status"
        aria-busy="true"
        aria-label="책 펼치는 중"
        className="relative mx-auto flex h-[calc(100dvh-4.8rem)] min-h-[520px] w-full max-w-[720px] flex-col items-center overflow-hidden bg-haru-paper px-6 pt-[4.5rem] md:mt-1 md:h-[calc(100dvh-6rem)] md:rounded-[28px]"
      >
        <Skeleton className="absolute left-3 top-2 size-10 rounded-full bg-white/80 sm:left-4" />
        <Skeleton className="aspect-[3/4] h-[min(280px,34%)] min-h-[150px] -rotate-2 rounded-l-[6px] rounded-r-[12px] bg-[#e8dccd]" />
        <Skeleton className="mt-9 h-8 w-2/3 max-w-sm rounded-full bg-[#efe4d6]" />
        <Skeleton className="mt-3 h-5 w-40 rounded-full bg-[#efe4d6]" />
        <div className="flex-1" />
        <Skeleton className="mb-12 h-[62px] w-full max-w-[420px] rounded-full bg-[#f6d3c3]" />
      </div>
    </main>
  );
}
