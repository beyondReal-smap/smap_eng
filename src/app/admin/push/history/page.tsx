import Link from 'next/link';
import { desc } from 'drizzle-orm';
import { db } from '@/lib/db';
import { pushSendLogs, users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 50;

/** /admin/push/history — 발송 이력 전체 리스트. 페이지네이션은 다음 라운드. */
export default async function PushHistoryPage() {
  const rows = await db
    .select({
      id: pushSendLogs.id,
      audience: pushSendLogs.audience,
      targetUserId: pushSendLogs.targetUserId,
      title: pushSendLogs.title,
      body: pushSendLogs.body,
      deepLink: pushSendLogs.deepLink,
      audienceCount: pushSendLogs.audienceCount,
      successCount: pushSendLogs.successCount,
      failureCount: pushSendLogs.failureCount,
      status: pushSendLogs.status,
      errorMessage: pushSendLogs.errorMessage,
      createdAt: pushSendLogs.createdAt,
      completedAt: pushSendLogs.completedAt,
      actorEmail: users.email,
    })
    .from(pushSendLogs)
    .leftJoin(users, eq(users.id, pushSendLogs.actorUserId))
    .orderBy(desc(pushSendLogs.createdAt))
    .limit(PAGE_SIZE);

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold">발송 이력</h1>
          <p className="text-sm text-muted-foreground">최근 {PAGE_SIZE}건까지 표시합니다.</p>
        </div>
        <Link
          href="/admin/push"
          className="rounded-xl border border-border px-3 py-1.5 text-sm font-semibold hover:bg-muted"
        >
          ← 발송 화면
        </Link>
      </header>

      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        {rows.length === 0 ? (
          <p className="p-12 text-center text-sm text-muted-foreground">
            아직 발송한 푸시가 없습니다.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">시각</th>
                <th className="px-4 py-3 text-left font-semibold">작업자</th>
                <th className="px-4 py-3 text-left font-semibold">대상</th>
                <th className="px-4 py-3 text-left font-semibold">제목/본문</th>
                <th className="px-4 py-3 text-right font-semibold">결과</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-border align-top">
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">
                    {/*
                      Vercel/서버 시스템 timezone 이 UTC 일 때 한국 사용자에게 9시간
                      어긋난 시간을 보여주는 문제 방지. KST 강제.
                    */}
                    {row.createdAt.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}
                    {row.completedAt && (
                      <div className="text-[10px]">
                        완료 {row.completedAt.toLocaleTimeString('ko-KR', { timeZone: 'Asia/Seoul' })}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs">{row.actorEmail ?? '—'}</td>
                  <td className="px-4 py-3 text-xs">
                    <div className="font-semibold">{AUDIENCE_LABEL[row.audience] ?? row.audience}</div>
                    <div className="text-muted-foreground">{row.audienceCount}명</div>
                    {row.targetUserId && (
                      <div className="text-[10px] text-muted-foreground">{row.targetUserId}</div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {row.title && <div className="text-sm font-semibold">{row.title}</div>}
                    <div className="line-clamp-2 text-xs text-muted-foreground">{row.body}</div>
                    {row.deepLink && (
                      <div className="mt-1 text-[10px] text-primary">→ {row.deepLink}</div>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right text-xs">
                    <StatusBadge status={row.status} />
                    <div className="mt-1 text-muted-foreground">
                      성공 {row.successCount} · 실패 {row.failureCount}
                    </div>
                    {row.errorMessage && (
                      <div className="mt-1 text-[10px] text-rose-600">{translateError(row.errorMessage)}</div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
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

function translateError(code: string): string {
  if (code === 'target_not_found') return '대상 사용자를 찾지 못함';
  if (code === 'audience_empty') return '대상 인원 없음';
  return code;
}

function StatusBadge({ status }: { status: string }) {
  const tone =
    status === 'completed'
      ? 'bg-emerald-100 text-emerald-700'
      : status === 'failed'
        ? 'bg-rose-100 text-rose-700'
        : 'bg-amber-100 text-amber-700';
  const label = status === 'completed' ? '완료' : status === 'failed' ? '실패' : '진행 중';
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${tone}`}>
      {label}
    </span>
  );
}
