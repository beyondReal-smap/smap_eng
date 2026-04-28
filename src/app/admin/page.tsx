import Link from 'next/link';
import { AlertTriangle, ArrowRight } from 'lucide-react';
import {
  adminGetOverviewStats,
  adminListAllBooks,
} from '@/lib/db/queries';
import { requireAdminUser } from '@/lib/auth/session';
import { StatCard } from '@/components/admin/stat-card';

// 대시보드는 집계 쿼리 포함 → 매 요청 실시간 반영.
export const dynamic = 'force-dynamic';

export default async function AdminDashboardPage() {
  // Next.js 16: layout의 partial rendering 때문에 페이지 단위에서도 가드 필수.
  await requireAdminUser();
  const [stats, flaggedBooks] = await Promise.all([
    adminGetOverviewStats(),
    adminListAllBooks('flagged'),
  ]);
  const now = new Date();
  const monthLabel = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
  const recentFlags = flaggedBooks.slice(0, 5);

  return (
    <div className="flex flex-col gap-7">
      <header className="rounded-2xl border border-border bg-card/80 p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Admin Console
        </p>
        <h1 className="mt-2 text-2xl font-extrabold tracking-tight">대시보드</h1>
        <p className="mt-1 text-sm text-foreground/60">
          전체 서비스 지표와 즉시 확인해야 할 운영 항목입니다. 월 집계는 UTC 기준입니다.
        </p>
      </header>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="총 사용자" value={stats.totalUsers.toLocaleString()} />
        <StatCard
          label="총 프로필"
          value={stats.totalProfiles.toLocaleString()}
          hint="자녀 프로필 수"
        />
        <StatCard
          label="총 책"
          value={stats.totalBooks.toLocaleString()}
          hint="삭제·신고 포함"
        />
        <StatCard
          label="신고됨"
          value={stats.flaggedBooksCount.toLocaleString()}
          tone={stats.flaggedBooksCount > 0 ? 'warn' : 'default'}
          hint="보호자 신고 · 미삭제"
        />
        <StatCard
          label={`크레딧 소진 (${monthLabel})`}
          value={stats.creditsConsumedThisMonth.toLocaleString()}
          hint="consume 합계"
        />
        <StatCard
          label={`신규 책 (${monthLabel})`}
          value={stats.booksCreatedThisMonth.toLocaleString()}
          hint="삭제·신고 포함"
        />
        <StatCard
          label="구독 레코드"
          value={stats.activeSubscriptions.toLocaleString()}
          hint="가족 단위"
        />
        <StatCard
          label="전체 잔액"
          value={`${stats.totalCreditBalance.toLocaleString()}⭐`}
          hint="credit_balances 합계"
        />
        <StatCard
          label={`수동 지급 (${monthLabel})`}
          value={stats.creditsGrantedThisMonth.toLocaleString()}
          hint="grant 합계"
        />
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-2xl border border-border bg-card/80 p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold">신고 검토 대기</h2>
              <p className="text-xs text-muted-foreground">
                일반 책장에서는 숨겨진 책입니다. 필요 시 신고 해제 또는 책장에서 제외하세요.
              </p>
            </div>
            <Link
              href="/admin/books?filter=flagged"
              className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold hover:bg-muted"
            >
              전체 보기
              <ArrowRight className="size-3" />
            </Link>
          </div>

          {recentFlags.length === 0 ? (
            <p className="mt-5 rounded-xl border border-dashed border-border p-5 text-center text-sm text-muted-foreground">
              현재 신고 검토 대기 항목이 없습니다.
            </p>
          ) : (
            <ul className="mt-4 divide-y divide-border/70">
              {recentFlags.map((book) => (
                <li
                  key={book.id}
                  className="flex items-start justify-between gap-3 py-3"
                >
                  <div className="min-w-0">
                    <Link
                      href={`/book/${book.id}`}
                      className="truncate text-sm font-semibold underline-offset-2 hover:underline"
                    >
                      {book.title}
                    </Link>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {book.userEmail ?? '이메일 없음'} · {book.profileName ?? '프로필 없음'}
                    </p>
                    {book.flaggedReason ? (
                      <p className="mt-1 line-clamp-2 text-xs text-destructive">
                        {book.flaggedReason}
                      </p>
                    ) : null}
                  </div>
                  <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" />
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-card/80 p-4 shadow-sm">
          <h2 className="text-base font-semibold">빠른 이동</h2>
          <div className="mt-4 grid gap-2">
            <QuickLink href="/admin/users" label="사용자 권한 관리" />
            <QuickLink href="/admin/credits" label="크레딧 수동 지급" />
            <QuickLink href="/admin/subscriptions" label="구독 레코드 확인" />
            <QuickLink href="/admin/books" label="전체 책 모니터링" />
          </div>
        </div>
      </section>
    </div>
  );
}

function QuickLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between rounded-xl border border-border bg-background/60 px-3 py-2 text-sm font-semibold hover:bg-muted"
    >
      {label}
      <ArrowRight className="size-3.5 text-muted-foreground" />
    </Link>
  );
}
