import Link from 'next/link';
import type { Metadata } from 'next';
import { SiteFooter } from '@/components/site-footer';
import { BUSINESS_INFO } from '@/lib/legal/business';
import { LegalNav } from './legal-nav';

export const metadata: Metadata = {
  // 약관/방침 페이지는 검색엔진 노출 자체는 허용(투명성)하되, 자식 페이지에서
  // 각자 title을 덮어 쓰면 layout.tsx의 template과 합성된다.
  title: '약관 및 정책',
};

/**
 * /legal/* 공용 레이아웃.
 *
 * - 비로그인 사용자도 직접 접근 가능해야 하므로 (app) 그룹 밖에 별도로 둔다.
 * - SiteHeader/AppHeader는 인증 사용자 가정이라 여기서 쓰지 않고, 자체 미니 헤더로
 *   브랜드와 홈 링크만 노출한다.
 * - 좌측: 4개 페이지 사이드 네비, 우측: 본문, 하단: SiteFooter (랜딩과 동일 푸터).
 */
export default function LegalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-10 border-b border-border/60 bg-background/85 backdrop-blur">
        <div className="mx-auto flex w-[min(1160px,calc(100%-36px))] items-center justify-between py-4">
          <Link
            href="/"
            className="font-heading text-xl font-extrabold tracking-tight text-foreground"
          >
            {BUSINESS_INFO.serviceName}
          </Link>
          <Link
            href="/"
            className="text-sm text-muted-foreground transition hover:text-foreground hover:underline underline-offset-4"
          >
            홈으로
          </Link>
        </div>
      </header>

      <div className="mx-auto grid w-[min(1160px,calc(100%-36px))] flex-1 grid-cols-1 gap-8 py-8 lg:grid-cols-[220px_1fr] lg:gap-14 lg:py-12">
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <LegalNav />
        </aside>

        <main className="min-w-0">
          <article className="legal-article max-w-3xl text-foreground/90">
            {children}
          </article>
        </main>
      </div>

      <SiteFooter />
    </div>
  );
}
