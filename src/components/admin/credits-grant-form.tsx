'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

interface Props {
  userId: string;
  /** 선택: 짧은 식별(이메일 등) — 토스트 메시지에 사용. */
  label?: string | null;
}

/** 어드민이 특정 유저에게 크레딧(별)을 수동 지급하는 폼. */
export function CreditsGrantForm({ userId, label }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [submitting, setSubmitting] = useState(false);
  const [amount, setAmount] = useState('10');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const delta = Number(amount);
    if (!Number.isInteger(delta) || delta <= 0) {
      toast.error('양의 정수를 입력하세요');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/credits/${userId}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ delta }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'unknown' }));
        toast.error(`지급 실패: ${data.error ?? res.status}`);
        return;
      }
      const data = (await res.json()) as {
        result: { balance: number; txId: number };
      };
      toast.success(
        `${label ?? userId.slice(0, 8)} +${delta}별 → 잔액 ${data.result.balance}`,
      );
      setAmount('10');
      startTransition(() => router.refresh());
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex items-center gap-2">
      <input
        type="number"
        min={1}
        max={1_000_000}
        step={1}
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        className="w-28 rounded-md border border-foreground/15 bg-background px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring/40"
      />
      <Button type="submit" size="sm" disabled={submitting || pending}>
        지급
      </Button>
    </form>
  );
}
