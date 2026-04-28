'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { href: '/legal/terms', label: '이용약관' },
  { href: '/legal/privacy', label: '개인정보처리방침' },
  { href: '/legal/refund', label: '환불정책' },
  { href: '/legal/business', label: '사업자정보' },
] as const;

/**
 * /legal 라우트 좌측 사이드 네비 — 현재 경로 강조를 위해 클라이언트 컴포넌트로 분리.
 * 데스크톱에서는 세로 배치, 모바일에서는 가로 스크롤 가능한 칩 형태.
 */
export function LegalNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="약관 및 정책 메뉴"
      className="-mx-1 flex flex-row gap-1 overflow-x-auto px-1 lg:flex-col lg:overflow-visible"
    >
      {NAV_ITEMS.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={
              'shrink-0 rounded-md px-3 py-2 text-sm transition lg:shrink ' +
              (active
                ? 'bg-muted font-medium text-foreground'
                : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground')
            }
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
