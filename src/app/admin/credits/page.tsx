import Link from 'next/link';
import {
  adminGetCreditSummary,
  adminListUsersWithProfileCount,
} from '@/lib/db/queries';
import { requireAdminUser } from '@/lib/auth/session';
import { CreditsGrantForm } from '@/components/admin/credits-grant-form';
import { cn } from '@/lib/utils';

export const dynamic = 'force-dynamic';

interface Props {
  searchParams: Promise<{ userId?: string }>;
}

/**
 * /admin/credits — 좌: 사용자 목록(잔액 조회 진입점), 우: 선택된 유저의 잔액·원장·지급.
 * 선택은 쿼리스트링 ?userId=... 로 전달. 대량 사용자 대응은 Phase 1 이후 별도 과제.
 */
export default async function AdminCreditsPage({ searchParams }: Props) {
  // Next.js 16: layout 가드는 partial rendering으로 우회 가능 → 페이지 단위 재확인.
  await requireAdminUser();
  const { userId } = await searchParams;
  const users = await adminListUsersWithProfileCount();
  const selected = userId ? await adminGetCreditSummary(userId) : null;

  return (
    <div className="flex flex-col gap-5">
      <header>
        <h1 className="text-2xl font-medium tracking-tight">크레딧(별)</h1>
        <p className="mt-1 text-sm text-foreground/60">
          좌측에서 사용자를 선택하면 잔액·원장과 수동 지급 폼이 표시됩니다.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-[280px_1fr]">
        <aside className="max-h-[70vh] overflow-y-auto rounded-lg border border-foreground/10">
          <ul className="divide-y divide-foreground/5">
            {users.map((u) => {
              const active = u.id === userId;
              return (
                <li key={u.id}>
                  <Link
                    href={`/admin/credits?userId=${u.id}`}
                    className={cn(
                      'block px-3 py-2 text-xs',
                      active
                        ? 'bg-primary/10 text-primary'
                        : 'hover:bg-foreground/5',
                    )}
                  >
                    <div className="font-mono">{u.email ?? '—'}</div>
                    <div className="text-[10px] text-foreground/50">
                      {u.name ?? '—'} · 프로필 {u.profileCount}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </aside>

        <section className="rounded-lg border border-foreground/10 p-4">
          {selected ? (
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <div>
                  <div className="font-mono text-sm">{selected.email ?? '—'}</div>
                  <div className="text-[10px] text-foreground/50">
                    #{selected.userId}
                  </div>
                </div>
                <div className="flex gap-4 text-sm">
                  <div>
                    <div className="text-[10px] uppercase tracking-wide text-foreground/50">
                      잔액
                    </div>
                    <div className="text-xl font-medium tabular-nums">
                      {selected.balance}⭐
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-wide text-foreground/50">
                      누적 구매
                    </div>
                    <div className="text-xl font-medium tabular-nums">
                      {selected.totalPurchased}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between rounded-md border border-dashed border-foreground/20 bg-foreground/[0.02] p-3">
                <p className="text-xs text-foreground/60">
                  수동 지급 (kind=grant, 양수 정수만)
                </p>
                <CreditsGrantForm
                  userId={selected.userId}
                  label={selected.email}
                />
              </div>

              <div>
                <h2 className="mb-2 text-sm font-medium">
                  최근 원장 (최대 50건)
                </h2>
                {selected.recentLedger.length === 0 ? (
                  <p className="py-6 text-center text-xs text-foreground/50">
                    원장 기록 없음
                  </p>
                ) : (
                  <div className="overflow-x-auto rounded-md border border-foreground/10">
                    <table className="w-full text-xs">
                      <thead className="bg-foreground/5 text-left uppercase tracking-wide text-foreground/60">
                        <tr>
                          <th className="px-2 py-1.5">시각</th>
                          <th className="px-2 py-1.5">종류</th>
                          <th className="px-2 py-1.5 text-right">변화</th>
                          <th className="px-2 py-1.5">패키지/책</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selected.recentLedger.map((r) => (
                          <tr
                            key={r.id}
                            className="border-t border-foreground/5"
                          >
                            <td className="px-2 py-1.5 font-mono text-[10px] text-foreground/60">
                              {new Date(r.createdAt)
                                .toISOString()
                                .replace('T', ' ')
                                .slice(0, 16)}
                            </td>
                            <td className="px-2 py-1.5">{r.kind}</td>
                            <td
                              className={cn(
                                'px-2 py-1.5 text-right font-mono tabular-nums',
                                r.delta >= 0
                                  ? 'text-emerald-600'
                                  : 'text-destructive',
                              )}
                            >
                              {r.delta >= 0 ? `+${r.delta}` : r.delta}
                            </td>
                            <td className="px-2 py-1.5 text-[10px] text-foreground/60">
                              {r.packageId ?? (r.bookId ? `#${r.bookId}` : '—')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <p className="py-10 text-center text-sm text-foreground/50">
              좌측에서 사용자를 선택하세요.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
