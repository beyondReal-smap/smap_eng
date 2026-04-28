'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { AdminUserRow } from '@/lib/db/queries';

interface Props {
  rows: AdminUserRow[];
  currentAdminId: string;
}

export function UsersTable({ rows, currentAdminId }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  async function toggleRole(row: AdminUserRow) {
    const nextRole = row.role === 'admin' ? 'user' : 'admin';
    const res = await fetch(`/api/admin/users/${row.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ role: nextRole }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({ error: 'unknown' }));
      toast.error(`변경 실패: ${data.error ?? res.status}`);
      return;
    }
    toast.success(
      `${row.email ?? row.id.slice(0, 8)} → ${nextRole === 'admin' ? '관리자' : '일반 사용자'}`,
    );
    startTransition(() => router.refresh());
  }

  if (rows.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-foreground/60">
        일치하는 사용자가 없습니다.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-foreground/10">
      <table className="w-full text-sm">
        <thead className="bg-foreground/5 text-left text-xs uppercase tracking-wide text-foreground/60">
          <tr>
            <th className="px-3 py-2">이메일</th>
            <th className="px-3 py-2">이름</th>
            <th className="px-3 py-2">역할</th>
            <th className="px-3 py-2 text-right">프로필</th>
            <th className="px-3 py-2">가입일</th>
            <th className="px-3 py-2">액션</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const isSelf = r.id === currentAdminId;
            return (
              <tr
                key={r.id}
                className="border-t border-foreground/5 hover:bg-foreground/[0.02]"
              >
                <td className="px-3 py-2 font-mono text-xs">
                  {r.email ?? '—'}
                </td>
                <td className="px-3 py-2">{r.name ?? '—'}</td>
                <td className="px-3 py-2">
                  <Badge variant={r.role === 'admin' ? 'default' : 'secondary'}>
                    {r.role === 'admin' ? '관리자' : '일반'}
                  </Badge>
                  {isSelf ? (
                    <span className="ml-2 text-[10px] text-foreground/50">
                      (나)
                    </span>
                  ) : null}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {r.profileCount}
                </td>
                <td className="px-3 py-2 text-xs text-foreground/60">
                  {new Date(r.createdAt).toISOString().slice(0, 10)}
                </td>
                <td className="px-3 py-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={pending || (isSelf && r.role === 'admin')}
                    onClick={() => toggleRole(r)}
                    title={
                      isSelf && r.role === 'admin'
                        ? '자기 자신은 강등할 수 없습니다'
                        : undefined
                    }
                  >
                    {r.role === 'admin' ? '강등' : '관리자로'}
                  </Button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
