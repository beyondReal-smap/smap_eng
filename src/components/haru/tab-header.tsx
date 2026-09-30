import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * 메인 탭 화면(책장·단어장·통계) 공용 제목 줄 — 세 화면의 제목이 늘 같은 자리에 오게 한다.
 * iOS `TabHeader`와 같은 규칙: 위 8px + 높이 48px 줄의 세로 가운데에 제목(ExtraBold 26/30).
 * 오른쪽 칩이 있든 없든 제목 위치가 같다. 좌우 여백은 `TAB_PAGE_SHELL`이 준다.
 */
export function TabHeader({
  title,
  trailing,
  className,
}: {
  title: string;
  trailing?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cn('flex min-h-12 items-center justify-between gap-3 pt-2', className)}>
      <h1 className="min-w-0 truncate text-[26px] font-extrabold leading-tight tracking-[-0.02em] text-haru-ink sm:text-[30px]">
        {title}
      </h1>
      {trailing ? <div className="flex shrink-0 items-center gap-1.5">{trailing}</div> : null}
    </header>
  );
}

/**
 * 메인 탭 화면의 바깥 틀 — 데스크톱에서는 상단 헤더(`.landing-scope .page`, 최대 1160px)와 같은 폭이라
 * 제목이 로고와 같은 세로선에 선다. 본문 카드는 각 화면이 안쪽에서 읽기 좋은 폭으로 가운데 정렬한다.
 */
export const TAB_PAGE_SHELL =
  'mx-auto w-full max-w-[1160px] px-3 pb-24 pt-3 sm:px-6 lg:w-[calc(100%-36px)] lg:px-0';
