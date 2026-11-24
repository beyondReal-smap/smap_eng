'use client';

import { Popover } from '@base-ui/react/popover';
import Link from 'next/link';
import { useState } from 'react';
import {
  BarChart3,
  BookOpen,
  ChevronDown,
  CreditCard,
  LibraryBig,
  LogIn,
  LogOut,
  ShieldCheck,
  Star,
} from 'lucide-react';
import { toast } from 'sonner';
import { useSession, signOut as nextAuthSignOut } from 'next-auth/react';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useCreditBalance } from '@/lib/hooks/use-credit-balance';
import { formatStars } from '@/lib/billing/terminology';
import { APP_HOME } from '@/lib/paths';

/**
 * 헤더 우측 계정 메뉴.
 *
 * 비로그인: "로그인" 버튼.
 * 로그인: 아바타(이니셜) + 이름/이메일 + Popover 메뉴(책장·단어장·통계 / 보호자 모드·별 충전 / 로그아웃).
 * 모바일 햄버거(MobileMenu)와 같은 항목 — 헤더에서 아이 전환을 뺀 뒤(2026-09-30) 데스크톱의
 * 유일한 전역 메뉴라 화면 이동 바로가기도 여기 둔다.
 *
 * 인증 세션은 Auth.js(`useSession()`)에서 가져오고,
 * 별 잔액은 `/api/billing/credits` 페치 결과를 메뉴 헤더에 노출.
 */
export function AccountMenu() {
  const { data: session, status } = useSession();
  const [open, setOpen] = useState(false);
  // hooks-rules: 조건부 호출 금지 → 항상 호출하되 미인증 시 enabled=false로 페치 차단.
  const { credits, loading: creditsLoading } = useCreditBalance({
    enabled: status === 'authenticated',
  });

  // 세션 fetch 중 (SessionProvider 초기 로드) — SSR/CSR mismatch 방지 스켈레톤.
  if (status === 'loading') {
    return <div className="h-9 w-24 animate-pulse rounded-full bg-muted/60" />;
  }

  const user = session?.user;

  if (!user) {
    // 2026-04-26 옵션 B: AuthHeader의 .button.button-primary와 같은 디자인 언어로
    // 통일. 헤더 안에 들어가야 하므로 `.button.nav-cta`로 헤더 사이즈로 축소.
    // .landing-scope 자손에서만 스타일이 적용되므로 SiteHeader 내부에서만 정상 표시.
    return (
      <Link
        href="/login"
        className="button button-ghost nav-cta"
        aria-label="로그인"
      >
        <LogIn className="size-3.5" aria-hidden />
        로그인
      </Link>
    );
  }

  const displayEmail = user.email ?? '';
  const displayName =
    user.name ?? (displayEmail ? displayEmail.split('@')[0] : '사용자');
  const initials = (displayEmail || displayName).slice(0, 1).toUpperCase();

  function handleSignOut() {
    setOpen(false);
    toast.success('로그아웃되었어요');
    nextAuthSignOut({ callbackUrl: '/login' });
  }

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger
        render={
          <button
            type="button"
            aria-label="내 계정"
            // ProfileSwitcher와 같은 .nav-pill 토큰으로 통일 (둥근 풀 + paper-warm).
            className="nav-pill"
          />
        }
      >
        <Avatar className="h-7 w-7">
          <AvatarFallback className="bg-haru-coral-soft text-xs font-extrabold text-haru-coral-ink">
            {initials}
          </AvatarFallback>
        </Avatar>
        <span className="hidden max-w-[120px] truncate sm:inline">
          {displayName}
        </span>
        <ChevronDown aria-hidden className="nav-pill-chev" />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner sideOffset={8} align="end">
          <Popover.Popup className="z-50 w-[260px] overflow-hidden rounded-2xl border border-border bg-popover p-1.5 text-sm text-popover-foreground shadow-xl ring-1 ring-foreground/5 outline-none animate-fade-up">
            <div className="flex items-center gap-2.5 px-2 py-2.5">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-haru-coral-soft text-base font-extrabold text-haru-coral-ink">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{displayName}</p>
                {displayEmail ? (
                  <p className="text-[11px] text-muted-foreground">
                    {displayEmail}
                  </p>
                ) : null}
                <p
                  className="mt-0.5 inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground"
                  aria-live="polite"
                >
                  <Star aria-hidden className="size-3 fill-[#e08a1e] text-[#e08a1e]" />
                  {creditsLoading
                    ? '잔액 확인 중…'
                    : credits === null
                      ? '잔액을 불러오지 못했어요'
                      : credits.balance === 0
                        ? '별이 모두 사용되었어요'
                        : `${formatStars(credits.balance)} 보유`}
                </p>
              </div>
            </div>

            <div className="my-1 h-px bg-border/60" />

            <MenuLink href={APP_HOME} icon={<LibraryBig className="size-4" />} onSelect={() => setOpen(false)}>
              책장
            </MenuLink>
            <MenuLink href="/vocab" icon={<BookOpen className="size-4" />} onSelect={() => setOpen(false)}>
              단어장
            </MenuLink>
            <MenuLink href="/stats" icon={<BarChart3 className="size-4" />} onSelect={() => setOpen(false)}>
              통계
            </MenuLink>

            <div className="my-1 h-px bg-border/60" />

            <MenuLink href="/parents" icon={<ShieldCheck className="size-4" />} onSelect={() => setOpen(false)}>
              보호자 모드
            </MenuLink>
            <MenuLink href="/subscribe" icon={<CreditCard className="size-4" />} onSelect={() => setOpen(false)}>
              별 충전
            </MenuLink>

            <div className="my-1 h-px bg-border/60" />

            <button
              type="button"
              onClick={handleSignOut}
              className="flex w-full items-center gap-2 rounded-xl px-2 py-2 text-left text-sm font-bold text-haru-ink transition hover:bg-haru-paper"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f2f0ed] text-haru-muted">
                <LogOut aria-hidden className="size-4" />
              </span>
              로그아웃
            </button>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}

function MenuLink({
  href,
  icon,
  onSelect,
  children,
}: {
  href: string;
  icon: React.ReactNode;
  /** 헤더는 layout에 남아 이동 후에도 마운트돼 있으므로, 누르면 메뉴를 직접 닫는다. */
  onSelect: () => void;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      onClick={onSelect}
      className="flex w-full items-center gap-2 rounded-xl px-2 py-2 text-left text-sm font-bold text-haru-ink transition hover:bg-haru-paper"
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-haru-coral-soft text-haru-coral-ink">
        {icon}
      </span>
      {children}
    </Link>
  );
}

