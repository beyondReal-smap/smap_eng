import { TAB_PAGE_SHELL } from '@/components/haru';
import { StatsSkeleton } from '@/components/stats-dashboard';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * 통계 fallback — main 셸만 그린다. SiteHeader는 (app)/layout.tsx가 보유해
 * 페이지 이동 사이에도 그대로 유지되므로 폴백에서 별도 헤더를 그릴 필요가 없다(2026-04-27).
 * 제목 줄(TabHeader와 같은 높이) + 대시보드 자리표시와 같은 모양이라 도착 시 점프가 없다.
 */
export default function StatsLoading() {
  return (
    <main role="status" aria-busy="true" aria-label="독서 기록 모으는 중" className={TAB_PAGE_SHELL}>
      <div className="flex min-h-12 items-center pt-2">
        <Skeleton className="h-8 w-48 rounded-full bg-white/60" />
      </div>
      <StatsSkeleton />
    </main>
  );
}
