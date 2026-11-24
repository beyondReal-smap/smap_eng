import { ShelfSkeleton } from '@/components/bookshelf';
import { Bookcase } from '@/components/bookshelf/components';
import { TAB_PAGE_SHELL } from '@/components/haru';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * 책장(/) 진입 fallback — `(app)/page.tsx`가 server에서 auth() 분기 후
 * RSC payload를 흘려주는 동안 보여줄 본문 골격.
 *
 * 헤더(`SiteHeader`)는 `(app)/layout.tsx`가 보유해 fallback 단계에도 유지된다.
 * 따라서 여기서는 본문(main) 셸만 그린다 — page.tsx와 같은 컨테이너·같은 책장 케이스
 * (그림책 세계, 2026-09-30)로 좌표를 맞춰 RSC 도착 시 layout shift가 없게 한다:
 *   1) 제목 + 칩 자리  2) 곰 인사 줄 높이(124px)  3) 나무 케이스 + 선반 자리표시
 *
 * 비로그인은 `(app)/page.tsx`가 `<LandingPage/>`를 반환해 이 fallback은 거의 노출되지 않는다.
 */
export default function AppHomeLoading() {
  return (
    <main
      role="status"
      aria-busy="true"
      aria-label="책장 여는 중"
      className={`${TAB_PAGE_SHELL} space-y-3.5`}
    >
      <div className="flex min-h-12 items-center justify-between gap-3 pt-2">
        <Skeleton className="h-8 w-40 rounded-full bg-white/60" />
        <div className="flex gap-1.5">
          <Skeleton className="h-[34px] w-16 rounded-full bg-white/60" />
          <Skeleton className="size-[38px] rounded-full bg-white/60" />
        </div>
      </div>
      <div className="min-h-[124px]" />
      <Bookcase busy>
        <ShelfSkeleton />
      </Bookcase>
    </main>
  );
}
