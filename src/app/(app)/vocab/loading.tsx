import { TAB_PAGE_SHELL } from "@/components/haru";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * 단어장 fallback — main 셸만 그린다. SiteHeader는 (app)/layout.tsx가 보유해
 * 페이지 이동 사이에도 그대로 유지되므로 폴백에서 별도 헤더를 그릴 필요가 없다(2026-04-27).
 * 그림책 세계 단어 카드(2026-09-30)와 같은 좌표: 제목 줄 → 칩 줄 → 카드 자리.
 */
export default function VocabLoading() {
  return (
    <main
      role="status"
      aria-busy="true"
      aria-label="단어장 여는 중"
      className={TAB_PAGE_SHELL}
    >
      <div className="flex min-h-12 items-center justify-between gap-3 pt-2">
        <Skeleton className="h-8 w-32 rounded-full bg-white/60" />
        <Skeleton className="h-[38px] w-28 rounded-full bg-white/60" />
      </div>
      <div className="mx-auto mt-3.5 w-full max-w-[520px]">
        <div className="flex min-h-11 items-center gap-1.5">
          <Skeleton className="h-8 w-16 rounded-[14px] bg-white/60" />
          <Skeleton className="h-8 w-24 rounded-[14px] bg-white/60" />
          <Skeleton className="h-8 w-16 rounded-[14px] bg-white/60" />
        </div>
        <Skeleton className="mx-auto mt-[52px] h-[430px] max-w-[336px] rounded-[26px] bg-haru-paper/80" />
      </div>
    </main>
  );
}
