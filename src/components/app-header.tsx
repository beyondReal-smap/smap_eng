import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

import { AccountMenu } from '@/components/account-menu';
import { AuthHeaderRight } from '@/components/auth/auth-header-right';
import { MobileMenu } from '@/components/mobile-menu';
import { ProfileSwitcher } from '@/components/profile-switcher';
import { APP_HOME } from '@/lib/paths';

/**
 * 앱 전역 단일 헤더 컴포넌트.
 *
 * 책장(`SiteHeader`), 인증(`AuthHeader`), 랜딩(`LandingPage`), `loading.tsx`
 * fallback이 각자 마크업을 들고 있던 시절, wrapper 클래스 1개·padding-top
 * 1픽셀이 어긋나며 brand 위치가 페이지마다 달라 보이는 회귀가 반복됐다
 * (2026-04-26 피드백). 정답은 분기 자체를 없애는 것 — 모든 헤더가 이 컴포넌트
 * 한 곳에서 나오도록 통합.
 *
 * 좌측(brand·back link)·wrapper(`.landing-scope.app-header-shell`)·`<header
 * className="page nav">` 마크업은 100% 공유. 우측 클러스터만 `variant`로 분기:
 *
 *   - `app`             : ProfileSwitcher + AccountMenu + 모바일 햄버거(MobileMenu)
 *   - `auth`            : 페이지 링크 3개 + 로그인/회원가입 primary CTA
 *   - `landing`         : 랜딩 메뉴 4개 + "앱 시작하기" primary CTA
 *   - `app-fallback`    : 우측 비움. 책장 사용자 fallback에서 빈 placeholder가
 *                         시각 노이즈가 된다는 피드백(2026-04-26).
 *
 * `centered`는 결제/구독 페이지처럼 단계 흐름에 집중시키는 3-column 변형.
 * `backHref`/`backLabel`은 서브 페이지에서 좌측 백 링크가 필요할 때.
 */

type Variant = 'app' | 'auth' | 'landing' | 'app-fallback';

interface Props {
  variant: Variant;
  backHref?: string;
  backLabel?: string;
  /** 결제/구독처럼 brand만 가운데에 띄우고 양쪽에 back/menu만 두는 변형. */
  centered?: boolean;
}

function Brand({ hideLabel = false }: { hideLabel?: boolean }) {
  return (
    <Link href={APP_HOME} className="brand" aria-label="하루책 홈">
      <span className="brand-mark" aria-hidden>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/book_icon.png" alt="" width={30} height={30} />
      </span>
      {!hideLabel && <span>하루책</span>}
    </Link>
  );
}

function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      aria-label={`${label} 돌아가기`}
      className="press-scale -ml-1.5 inline-flex h-9 items-center gap-1 rounded-full px-2.5 text-[0.92rem] font-semibold leading-[1.2] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
    >
      <ArrowLeft className="size-4" aria-hidden strokeWidth={2.4} />
      <span className="hidden sm:inline">{label}</span>
    </Link>
  );
}

function RightCluster({ variant }: { variant: Variant }) {
  if (variant === 'app-fallback') return null;

  if (variant === 'app') {
    return (
      <nav aria-label="앱 메뉴" className="nav-links">
        {/* 모바일(<640px): 햄버거 1개. 데스크탑: ProfileSwitcher + AccountMenu. */}
        <div className="sm:hidden">
          <MobileMenu />
        </div>
        <div className="hidden items-center gap-[0.4rem] sm:flex">
          <ProfileSwitcher />
          <AccountMenu />
        </div>
      </nav>
    );
  }

  if (variant === 'auth') {
    return <AuthHeaderRight />;
  }

  // variant === 'landing'
  return (
    <nav className="nav-links" aria-label="랜딩 메뉴">
      <Link href="/#how">이용 방법</Link>
      <Link href="/#books">오늘의 책</Link>
      <Link href="/#features">기능</Link>
      <Link className="button button-primary nav-cta" href="/login?callbackUrl=%2F">
        앱 시작하기
      </Link>
    </nav>
  );
}

export function AppHeader({
  variant,
  backHref,
  backLabel = '책장으로',
  centered = false,
}: Props) {
  const right = <RightCluster variant={variant} />;

  if (centered) {
    return (
      <div className="landing-scope app-header-shell">
        <header
          className="page"
          aria-label="주요 메뉴"
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr auto 1fr',
            alignItems: 'center',
            gap: '1rem',
            padding: '1.1rem 0',
          }}
        >
          <div style={{ justifySelf: 'start' }}>
            {backHref ? <BackLink href={backHref} label={backLabel} /> : null}
          </div>
          <div style={{ justifySelf: 'center' }}>
            <Brand hideLabel />
          </div>
          <div style={{ justifySelf: 'end' }}>{right}</div>
        </header>
      </div>
    );
  }

  return (
    <div className="landing-scope app-header-shell">
      <header className="page nav" aria-label="주요 메뉴">
        {backHref ? (
          <div className="flex items-center gap-2 sm:gap-3">
            <BackLink href={backHref} label={backLabel} />
            <Brand />
          </div>
        ) : (
          <Brand />
        )}
        {right}
      </header>
    </div>
  );
}
