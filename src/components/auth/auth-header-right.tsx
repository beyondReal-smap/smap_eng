'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

/**
 * `/login`·`/signup` 헤더 우측 클러스터.
 *
 * `usePathname`으로 현재 경로에 따라 primary CTA를 전환:
 *   - /signup → "로그인"  (이미 회원가입 폼이 있으므로 기존 유저 전환)
 *   - /login  → "회원가입" (신규 유저 전환)
 *
 * `AppHeader`가 server component이므로, client hook이 필요한 우측만 분리해
 * client boundary로 둔다.
 */
export function AuthHeaderRight() {
  const pathname = usePathname();
  const isLogin = pathname === '/login';
  const primary = isLogin
    ? { href: '/signup', label: '회원가입' }
    : { href: '/login', label: '로그인' };

  return (
    <nav className="nav-links" aria-label="인증 메뉴">
      <Link href="/#how" className="hidden md:inline-flex">
        이용 방법
      </Link>
      <Link href="/#books" className="hidden md:inline-flex">
        오늘의 책
      </Link>
      <Link href="/#features" className="hidden md:inline-flex">
        기능
      </Link>
      <Link href={primary.href} className="button button-primary nav-cta">
        {primary.label}
      </Link>
    </nav>
  );
}
