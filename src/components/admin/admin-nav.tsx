'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  BookOpen,
  Coins,
  CreditCard,
  Send,
  ArrowLeft,
} from 'lucide-react';

import { APP_HOME } from '@/lib/paths';

const ITEMS = [
  { href: '/admin', label: '대시보드', icon: LayoutDashboard },
  { href: '/admin/users', label: '사용자', icon: Users },
  { href: '/admin/books', label: '책 모니터링', icon: BookOpen },
  { href: '/admin/credits', label: '크레딧', icon: Coins },
  { href: '/admin/subscriptions', label: '구독 현황', icon: CreditCard },
  { href: '/admin/push', label: '푸시 발송', icon: Send },
] as const;

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="flex w-full flex-col gap-1 border-b border-border bg-card/70 p-3 md:min-h-screen md:w-60 md:border-b-0 md:border-r md:p-4">
      <Link
        href={APP_HOME}
        className="mb-2 inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        일반 화면으로
      </Link>
      <div className="px-3 pb-1 pt-2 text-[10px] font-extrabold uppercase tracking-[0.18em] text-muted-foreground">
        관리자
      </div>
      {ITEMS.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          aria-current={isActive(pathname, item.href) ? 'page' : undefined}
          className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-foreground/75 hover:bg-muted hover:text-foreground aria-[current=page]:bg-primary aria-[current=page]:text-primary-foreground"
        >
          <item.icon className="h-4 w-4" />
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

function isActive(pathname: string, href: string): boolean {
  if (href === '/admin') return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}
