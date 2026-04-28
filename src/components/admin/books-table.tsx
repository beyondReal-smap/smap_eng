'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { AdminBookRow } from '@/lib/db/queries';

interface Props {
  rows: AdminBookRow[];
}

export function BooksTable({ rows }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [flagTarget, setFlagTarget] = useState<AdminBookRow | null>(null);
  const [flagReason, setFlagReason] = useState('');

  async function callJson(
    url: string,
    method: 'POST' | 'DELETE',
    body?: unknown,
  ): Promise<boolean> {
    const res = await fetch(url, {
      method,
      headers: body ? { 'content-type': 'application/json' } : {},
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({ error: 'unknown' }));
      toast.error(`실패: ${data.error ?? res.status}`);
      return false;
    }
    return true;
  }

  async function onSoftDelete(row: AdminBookRow) {
    if (!confirm(`"${row.title}" 책장에서 치울까요? (복원 가능)`)) return;
    if (await callJson(`/api/admin/books/${row.id}`, 'DELETE')) {
      toast.success('책장에서 제외됨');
      startTransition(() => router.refresh());
    }
  }

  async function onRestore(row: AdminBookRow) {
    if (await callJson(`/api/admin/books/${row.id}/restore`, 'POST')) {
      toast.success('복원 완료');
      startTransition(() => router.refresh());
    }
  }

  async function onUnflag(row: AdminBookRow) {
    if (await callJson(`/api/admin/books/${row.id}/flag`, 'DELETE')) {
      toast.success('신고 철회');
      startTransition(() => router.refresh());
    }
  }

  async function submitFlag() {
    if (!flagTarget) return;
    const reason = flagReason.trim();
    if (!reason) {
      toast.error('사유를 입력하세요');
      return;
    }
    if (
      await callJson(`/api/admin/books/${flagTarget.id}/flag`, 'POST', {
        reason,
      })
    ) {
      toast.success('신고 처리됨');
      setFlagTarget(null);
      setFlagReason('');
      startTransition(() => router.refresh());
    }
  }

  if (rows.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-foreground/60">
        조건에 맞는 책이 없습니다.
      </p>
    );
  }

  return (
    <>
      <div className="overflow-x-auto rounded-lg border border-foreground/10">
        <table className="w-full text-sm">
          <thead className="bg-foreground/5 text-left text-xs uppercase tracking-wide text-foreground/60">
            <tr>
              <th className="px-3 py-2">제목</th>
              <th className="px-3 py-2">소유자</th>
              <th className="px-3 py-2">레벨</th>
              <th className="px-3 py-2">상태</th>
              <th className="px-3 py-2">생성일</th>
              <th className="px-3 py-2">액션</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.id}
                className="border-t border-foreground/5 hover:bg-foreground/[0.02]"
              >
                <td className="px-3 py-2">
                  <Link
                    href={`/book/${r.id}`}
                    className="underline-offset-2 hover:underline"
                  >
                    {r.title}
                  </Link>
                  <div className="text-[10px] text-foreground/40">
                    #{r.id}
                  </div>
                </td>
                <td className="px-3 py-2">
                  <div className="font-mono text-xs">
                    {r.userEmail ?? '—'}
                  </div>
                  <div className="text-[10px] text-foreground/50">
                    {r.profileName ?? '—'}
                  </div>
                </td>
                <td className="px-3 py-2 text-xs">
                  {r.age}세 · {r.cefr}
                </td>
                <td className="px-3 py-2">
                  {r.deletedAt ? (
                    <Badge variant="secondary">삭제됨</Badge>
                  ) : r.flaggedAt ? (
                    <Badge variant="destructive">
                      신고됨
                    </Badge>
                  ) : (
                    <Badge variant="outline">정상</Badge>
                  )}
                  {r.flaggedReason ? (
                    <div
                      className="mt-1 max-w-xs truncate text-[10px] text-foreground/50"
                      title={r.flaggedReason}
                    >
                      {r.flaggedReason}
                    </div>
                  ) : null}
                </td>
                <td className="px-3 py-2 text-xs text-foreground/60">
                  {new Date(r.createdAt).toISOString().slice(0, 10)}
                </td>
                <td className="px-3 py-2">
                  <div className="flex flex-wrap gap-1.5">
                    {r.deletedAt ? (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={pending}
                        onClick={() => onRestore(r)}
                      >
                        복원
                      </Button>
                    ) : (
                      <>
                        {r.flaggedAt ? (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={pending}
                            onClick={() => onUnflag(r)}
                          >
                            신고 해제
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={pending}
                            onClick={() => {
                              setFlagTarget(r);
                              setFlagReason('');
                            }}
                          >
                            신고
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={pending}
                          onClick={() => onSoftDelete(r)}
                        >
                          치우기
                        </Button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog
        open={flagTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setFlagTarget(null);
            setFlagReason('');
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>책 신고 처리</DialogTitle>
            <DialogDescription>
              <span className="font-medium">{flagTarget?.title}</span> 신고
              사유를 입력하세요 (1~500자).
            </DialogDescription>
          </DialogHeader>
          <textarea
            className="min-h-[100px] w-full rounded-md border border-foreground/15 bg-background p-2 text-sm outline-none focus:ring-2 focus:ring-ring/40"
            value={flagReason}
            onChange={(e) => setFlagReason(e.target.value)}
            maxLength={500}
            placeholder="예: 부적절한 콘텐츠 / 무서운 표현 / 부정확한 정보"
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setFlagTarget(null);
                setFlagReason('');
              }}
            >
              취소
            </Button>
            <Button disabled={pending} onClick={submitFlag}>
              신고
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
