import Link from 'next/link';
import { PushComposer } from '@/components/admin/push-composer';
import { db } from '@/lib/db';
import { pushSendLogs } from '@/lib/db/schema';
import { desc } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

/** /admin/push — 단건/세그먼트 푸시 발송 + 최근 5건 이력 미리보기. */
export default async function AdminPushPage() {
  const recent = await db
    .select({
      id: pushSendLogs.id,
      audience: pushSendLogs.audience,
      title: pushSendLogs.title,
      body: pushSendLogs.body,
      audienceCount: pushSendLogs.audienceCount,
      successCount: pushSendLogs.successCount,
      failureCount: pushSendLogs.failureCount,
      status: pushSendLogs.status,
      createdAt: pushSendLogs.createdAt,
    })
    .from(pushSendLogs)
    .orderBy(desc(pushSendLogs.createdAt))
    .limit(5);

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-extrabold">푸시 발송</h1>
        <p className="text-sm text-muted-foreground">
          단건 또는 세그먼트로 사용자에게 알림을 보냅니다. 발송 전 대상 인원을 미리 확인하고,
          이력은 자동으로 기록됩니다.
        </p>
      </header>

      <PushComposer />

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-muted-foreground">최근 발송 5건</h2>
          <Link
            href="/admin/push/history"
            className="text-xs font-semibold text-primary hover:underline"
          >
            전체 이력 →
          </Link>
        </div>
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          {recent.length === 0 ? (
            <p className="p-8 text-center text-sm text-muted-foreground">
              아직 발송한 푸시가 없습니다.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">시각</th>
                  <th className="px-4 py-3 text-left font-semibold">대상</th>
                  <th className="px-4 py-3 text-left font-semibold">제목/본문</th>
                  <th className="px-4 py-3 text-right font-semibold">결과</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((row) => (
                  <tr key={row.id} className="border-t border-border align-top">
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">
                      {row.createdAt.toLocaleString('ko-KR', {
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <AudienceBadge audience={row.audience} count={row.audienceCount} />
                    </td>
                    <td className="px-4 py-3">
                      {row.title ? (
                        <div className="text-sm font-semibold">{row.title}</div>
                      ) : null}
                      <div className="line-clamp-1 text-xs text-muted-foreground">
                        {row.body}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-xs">
                      <StatusBadge status={row.status} />
                      <div className="mt-1 text-muted-foreground">
                        성공 {row.successCount} · 실패 {row.failureCount}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
}

const AUDIENCE_LABEL: Record<string, string> = {
  single: '단건',
  all_active: '활성 사용자',
  subscribers: '구독자',
  dormant: '도르맨트',
  new_users: '신규 가입',
};

function AudienceBadge({ audience, count }: { audience: string; count: number }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold">
      {AUDIENCE_LABEL[audience] ?? audience}
      <span className="text-muted-foreground">· {count}명</span>
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const tone =
    status === 'completed'
      ? 'bg-emerald-100 text-emerald-700'
      : status === 'failed'
        ? 'bg-rose-100 text-rose-700'
        : 'bg-amber-100 text-amber-700';
  const label =
    status === 'completed' ? '완료' : status === 'failed' ? '실패' : '진행 중';
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${tone}`}>
      {label}
    </span>
  );
}
