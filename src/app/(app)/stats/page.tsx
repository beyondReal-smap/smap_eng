import Link from 'next/link';
import { StatsDashboard } from '@/components/stats-dashboard';
import { buttonVariants } from '@/components/ui/button';
import { APP_HOME } from '@/lib/paths';

export const dynamic = 'force-dynamic';

/**
 * SiteHeader는 (app)/layout.tsx가 보유해 페이지 이동 사이 마운트가 유지된다.
 * 책장 복귀 CTA는 본문 우측 상단의 outline `← 책장` 버튼(2026-04-27).
 */
export default function StatsPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
      <header className="mb-6 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            내 학습 통계
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            읽은 책, 레벨별 진도, 단어장, 최근 퀴즈 결과를 한눈에 봅니다.
          </p>
        </div>
        <Link
          href={APP_HOME}
          className={buttonVariants({
            variant: 'outline',
            size: 'sm',
            className: 'rounded-full press-scale shrink-0',
          })}
        >
          ← 책장
        </Link>
      </header>
      <StatsDashboard />
    </main>
  );
}
