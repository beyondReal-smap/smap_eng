'use client';

import { signOut } from 'next-auth/react';
import { cn } from '@/lib/utils';

/**
 * 로그아웃 버튼 — DB 세션 무효화 후 `/login` 으로 복귀.
 * AccountMenu 드롭다운 등에서 재사용.
 */
export function SignOutButton({
  className,
  children = '로그아웃',
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: '/login' })}
      className={cn(
        'inline-flex items-center justify-center rounded-lg px-3 py-2 text-sm font-medium',
        'text-muted-foreground transition-colors hover:text-foreground hover:bg-muted',
        className,
      )}
    >
      {children}
    </button>
  );
}
