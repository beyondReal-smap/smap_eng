import Link from 'next/link';
import { ParentalPinGate } from '@/components/parental-pin';
import { WeeklyReport } from '@/components/weekly-report';
import { buttonVariants } from '@/components/ui/button';
import { APP_HOME } from '@/lib/paths';

export const dynamic = 'force-dynamic';

/**
 * SiteHeader는 (app)/layout.tsx가 보유해 페이지 이동 사이 마운트가 유지된다.
 * 책장 복귀 CTA는 vocab/stats와 동일하게 본문 우측 상단의 outline `← 책장`
 * 버튼으로 통일(2026-04-27).
 */
export default function ParentsPage() {
  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6">
      <header className="mb-6 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            보호자 모드
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            자녀의 최근 학습 흐름을 확인합니다. PIN은 이 기기에만 저장되어요.
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
      <ParentalPinGate>
        <WeeklyReport />
      </ParentalPinGate>
    </main>
  );
}
