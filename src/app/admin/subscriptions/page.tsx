import { adminListSubscriptions } from '@/lib/db/queries';
import { requireAdminUser } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

/**
 * /admin/subscriptions — 읽기 전용. 결제 연동 전 단계에서는 cycleAnchorDay만 존재한다.
 * 수정/해지 UI는 결제 게이트웨이 연동 이후 별도 작업으로 분리.
 */
export default async function AdminSubscriptionsPage() {
  // Next.js 16: layout 가드는 partial rendering으로 우회 가능 → 페이지 단위 재확인.
  await requireAdminUser();
  const rows = await adminListSubscriptions();

  return (
    <div className="flex flex-col gap-5">
      <header>
        <h1 className="text-2xl font-medium tracking-tight">구독</h1>
        <p className="mt-1 text-sm text-foreground/60">
          가족(user) 단위 구독 레코드. 결제 연동 전에는 주기 앵커일만 보관합니다.
        </p>
      </header>

      <p className="text-xs text-foreground/50">총 {rows.length}건 (최대 500)</p>

      {rows.length === 0 ? (
        <p className="py-10 text-center text-sm text-foreground/60">
          구독 레코드가 없습니다.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-foreground/10">
          <table className="w-full text-sm">
            <thead className="bg-foreground/5 text-left text-xs uppercase tracking-wide text-foreground/60">
              <tr>
                <th className="px-3 py-2">이메일</th>
                <th className="px-3 py-2">사용자 ID</th>
                <th className="px-3 py-2 text-right">주기 앵커일</th>
                <th className="px-3 py-2">생성</th>
                <th className="px-3 py-2">갱신</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.userId}
                  className="border-t border-foreground/5 hover:bg-foreground/[0.02]"
                >
                  <td className="px-3 py-2 font-mono text-xs">
                    {r.email ?? '—'}
                  </td>
                  <td className="px-3 py-2 font-mono text-[10px] text-foreground/60">
                    {r.userId}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {r.cycleAnchorDay}일
                  </td>
                  <td className="px-3 py-2 text-xs text-foreground/60">
                    {new Date(r.createdAt).toISOString().slice(0, 10)}
                  </td>
                  <td className="px-3 py-2 text-xs text-foreground/60">
                    {new Date(r.updatedAt).toISOString().slice(0, 10)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
