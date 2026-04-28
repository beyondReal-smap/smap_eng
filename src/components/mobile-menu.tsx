'use client';

import { Popover } from '@base-ui/react/popover';
import {
  BarChart3,
  BookOpen,
  CreditCard,
  LibraryBig,
  LogIn,
  LogOut,
  Menu,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { signOut as nextAuthSignOut, useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { ProfileSwitcher } from '@/components/profile-switcher';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { buttonVariants } from '@/components/ui/button';
import { useCreditBalance } from '@/lib/hooks/use-credit-balance';
import { formatStars } from '@/lib/billing/terminology';
import { APP_HOME } from '@/lib/paths';
import { cn } from '@/lib/utils';

/**
 * 모바일(<640px) 전용 햄버거 메뉴.
 *
 * 데스크탑 헤더의 ProfileSwitcher / AccountMenu가 좁은 화면에서는 우측 클러스터를
 * 빽빽하게 만들어 단일 entry-point가 필요하다. 다만 "햄버거 panel 안에 또 popover를
 * 여는 AccountMenu를 통째로 넣는" 이전 구조는 이중 메뉴를 만들어 "로그아웃이 어디
 * 있는지 안 보인다"는 피드백을 받았다.
 *
 * 이번 구조는 햄버거 panel 안에 AccountMenu의 popover 콘텐츠를 평탄하게(flat) 펼친다:
 *   1) 사용자 헤더 (아바타·이름·이메일·별 잔액) — 비로그인 시 로그인 CTA
 *   2) ProfileSwitcher (자체 popover로 가족 구성원 전환)
 *   3) 바로가기 (단어장·통계·보호자, 로그인 시 별 충전 추가)
 *   4) 로그아웃 (destructive 톤으로 시각 분리, 로그인 시에만 노출)
 *
 * 햄버거 트리거는 44×44pt 터치 타깃을 만족하고, panel은 우상단 anchor로 iOS safe-area를
 * 침범하지 않는다.
 */
export function MobileMenu() {
  const { data: session, status } = useSession();
  const [open, setOpen] = useState(false);
  // hooks 규칙: 조건부 호출 금지 → 항상 호출하되 미인증 시 enabled=false로 페치 차단.
  const { credits, loading: creditsLoading } = useCreditBalance({
    enabled: status === 'authenticated',
  });

  const user = session?.user;
  const displayEmail = user?.email ?? '';
  const displayName =
    user?.name ?? (displayEmail ? displayEmail.split('@')[0] : '사용자');
  const initials = (displayEmail || displayName).slice(0, 1).toUpperCase();

  useEffect(() => {
    if (!open) return;

    const scrollY = window.scrollY;
    const { body, documentElement } = document;
    const previousBodyStyle = {
      position: body.style.position,
      top: body.style.top,
      left: body.style.left,
      right: body.style.right,
      width: body.style.width,
      overflow: body.style.overflow,
    };
    const previousHtmlOverscroll = documentElement.style.overscrollBehavior;

    body.style.position = 'fixed';
    body.style.top = `-${scrollY}px`;
    body.style.left = '0';
    body.style.right = '0';
    body.style.width = '100%';
    body.style.overflow = 'hidden';
    documentElement.style.overscrollBehavior = 'none';

    return () => {
      body.style.position = previousBodyStyle.position;
      body.style.top = previousBodyStyle.top;
      body.style.left = previousBodyStyle.left;
      body.style.right = previousBodyStyle.right;
      body.style.width = previousBodyStyle.width;
      body.style.overflow = previousBodyStyle.overflow;
      documentElement.style.overscrollBehavior = previousHtmlOverscroll;
      window.scrollTo(0, scrollY);
    };
  }, [open]);

  function handleSignOut() {
    setOpen(false);
    toast.success('로그아웃되었어요');
    nextAuthSignOut({ callbackUrl: '/login' });
  }

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger
        aria-label="메뉴 열기"
        // 2026-04-26 옵션 B: 헤더 좌측 brand-mark(2.6rem)와 같은 .nav-icon 토큰으로
        // 시각 대칭. .landing-scope 자손에서만 스타일이 적용되므로 SiteHeader 안에서만
        // 정상 표시된다.
        className="nav-icon press-scale"
      >
        <Menu aria-hidden className="size-5" strokeWidth={2.4} />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner
          sideOffset={14}
          align="end"
          alignOffset={0}
          className="z-[70]"
        >
          <Popover.Popup className="z-[70] max-h-[calc(100dvh-5.5rem)] w-[280px] overflow-y-auto overscroll-contain rounded-2xl border border-border bg-popover p-3 text-sm text-popover-foreground shadow-xl ring-1 ring-foreground/5 outline-none [-webkit-overflow-scrolling:touch] touch-pan-y animate-fade-up">
            <div className="flex flex-col gap-3">
              {/* 1) 사용자 헤더 / 비로그인 CTA */}
              {status === 'loading' ? (
                <div className="h-14 animate-pulse rounded-xl bg-muted/60" />
              ) : user ? (
                <div className="flex items-start gap-2.5 rounded-xl bg-muted/40 px-2.5 py-2.5">
                  <Avatar className="mt-0.5 h-10 w-10 shrink-0">
                    <AvatarFallback className="bg-primary/15 text-base font-extrabold text-primary">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1 pt-0.5">
                    <p className="text-sm font-semibold leading-tight">
                      {displayName}
                    </p>
                    {displayEmail ? (
                      <p className="mt-0.5 text-[11px] leading-tight text-muted-foreground">
                        {displayEmail}
                      </p>
                    ) : null}
                    <p
                      className="mt-1 flex min-w-0 items-center gap-1 text-[11px] font-medium leading-tight text-muted-foreground"
                      aria-live="polite"
                    >
                      <Sparkles aria-hidden className="size-3 shrink-0" />
                      <span>
                        {creditsLoading
                          ? '잔액 확인 중…'
                          : credits === null
                            ? '잔액을 불러오지 못했어요'
                            : credits.balance === 0
                              ? '별이 모두 사용되었어요'
                              : `${formatStars(credits.balance)} 보유`}
                      </span>
                    </p>
                  </div>
                </div>
              ) : (
                <Link
                  href="/login"
                  onClick={() => setOpen(false)}
                  className={cn(
                    buttonVariants({ variant: 'default', size: 'default' }),
                    'h-11 w-full rounded-full text-sm font-semibold',
                  )}
                >
                  <LogIn className="size-4" />
                  로그인 / 가입
                </Link>
              )}

              {/* 2) 프로필 전환 — 모바일에서는 중첩 Popover 대신 패널 안에 직접 표시 */}
              <div>
                <ProfileSwitcher
                  variant="inline"
                  onProfileSelected={() => setOpen(false)}
                />
              </div>

              {/* 3) 바로가기 */}
              <div className="border-t border-border/60 pt-3">
                <p className="mb-1.5 px-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  바로가기
                </p>
                <ul className="grid gap-0.5">
                  <ShortcutItem
                    href={APP_HOME}
                    icon={<LibraryBig className="size-4 text-foreground/60" />}
                    label="책장"
                    onSelect={() => setOpen(false)}
                  />
                  <ShortcutItem
                    href="/vocab"
                    icon={<BookOpen className="size-4 text-[color:var(--accent)]" />}
                    label="단어장"
                    onSelect={() => setOpen(false)}
                  />
                  <ShortcutItem
                    href="/stats"
                    icon={<BarChart3 className="size-4 text-foreground/60" />}
                    label="통계"
                    onSelect={() => setOpen(false)}
                  />
                  <ShortcutItem
                    href="/parents"
                    icon={<Users className="size-4 text-foreground/60" />}
                    label="보호자"
                    onSelect={() => setOpen(false)}
                  />
                  {user ? (
                    <ShortcutItem
                      href="/subscribe"
                      icon={<CreditCard className="size-4 text-foreground/60" />}
                      label="별 충전"
                      onSelect={() => setOpen(false)}
                    />
                  ) : null}
                  {user ? (
                    <ShortcutItem
                      href="/parents"
                      icon={<ShieldCheck className="size-4 text-foreground/60" />}
                      label="보호자 모드"
                      onSelect={() => setOpen(false)}
                    />
                  ) : null}
                </ul>
              </div>

              {/* 4) 로그아웃 — destructive 톤으로 시각적으로 분리 */}
              {user ? (
                <div className="border-t border-border/60 pt-3">
                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="flex min-h-[44px] w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm font-medium text-destructive transition hover:bg-destructive/10"
                  >
                    <span className="flex size-8 items-center justify-center rounded-full bg-destructive/10">
                      <LogOut aria-hidden className="size-4" />
                    </span>
                    로그아웃
                  </button>
                </div>
              ) : null}
            </div>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}

function ShortcutItem({
  href,
  icon,
  label,
  onSelect,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  onSelect: () => void;
}) {
  return (
    <li>
      <Link
        href={href}
        onClick={onSelect}
        className="flex min-h-[44px] items-center gap-2.5 rounded-lg px-2.5 py-2 transition hover:bg-muted"
      >
        {icon}
        <span className="font-medium">{label}</span>
      </Link>
    </li>
  );
}
