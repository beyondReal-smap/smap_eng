import { TAB_PAGE_SHELL } from '@/components/haru';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * 보호자 모드 fallback — main 셸만 그린다. SiteHeader는 (app)/layout.tsx가 보유해
 * 페이지 이동 사이에도 그대로 유지되므로 폴백에서 별도 헤더를 그릴 필요가 없다(2026-04-27).
 * 제목 줄(TabHeader 높이) + PIN 카드 자리 — ParentsHome과 같은 좌표.
 */
export default function ParentsLoading() {
  return (
    <main role="status" aria-busy="true" aria-label="보호자 영역 여는 중" className={TAB_PAGE_SHELL}>
      <div className="mx-auto max-w-[720px] space-y-6">
        <div className="flex min-h-12 items-center pt-2">
          <Skeleton className="h-8 w-40 rounded-full bg-white/60" />
        </div>
        <Skeleton className="mx-auto h-72 max-w-md rounded-[24px] bg-white/60" />
      </div>
    </main>
  );
}
