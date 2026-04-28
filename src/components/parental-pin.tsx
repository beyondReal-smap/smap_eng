'use client';

import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useParentalPin } from '@/lib/hooks/use-parental-pin';

/**
 * 보호자 PIN 게이트.
 *  - PIN이 없으면 4자리 설정 (2회 확인)
 *  - PIN이 있으면 입력 확인
 *  - 통과하면 children을 렌더
 *
 * COPPA Level-1: "아이가 실수로 진입하지 못하게 하는 수준".
 * 서버 업로드·ASR 등 실제 아동 개인정보를 다루는 기능에는 VPC가 별도 필요.
 */
export function ParentalPinGate({ children }: { children: React.ReactNode }) {
  const pin = useParentalPin();

  if (!pin.ready) {
    return <div className="h-64 animate-pulse rounded-2xl bg-muted/50" />;
  }
  if (pin.unlocked) {
    return (
      <>
        <div className="mb-4 flex items-center justify-between rounded-md border border-border/60 bg-card px-3 py-2 text-xs">
          <span className="text-muted-foreground">
            보호자 모드 · 30분 후 자동 잠금
          </span>
          <button
            type="button"
            onClick={pin.lock}
            className="rounded px-2 py-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            지금 잠그기
          </button>
        </div>
        {children}
      </>
    );
  }
  return pin.hasPin ? (
    <VerifyForm
      onVerify={async (p) => {
        const ok = await pin.verifyPin(p);
        if (!ok) toast.error('PIN이 달라요');
        return ok;
      }}
      onReset={() => {
        if (
          window.confirm(
            '저장된 PIN을 지울까요? 다시 접속하면 PIN을 새로 설정해야 합니다.',
          )
        ) {
          pin.resetPin();
          toast.success('PIN을 지웠어요');
        }
      }}
    />
  ) : (
    <SetupForm
      onSetup={async (p) => {
        await pin.setPin(p);
        toast.success('PIN을 설정했어요');
      }}
    />
  );
}

/** 4자리 숫자 입력 컨트롤 — 공용. */
function PinInput({
  value,
  onChange,
  autoFocus,
  id,
}: {
  value: string;
  onChange: (v: string) => void;
  autoFocus?: boolean;
  id?: string;
}) {
  return (
    <Input
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 4))}
      inputMode="numeric"
      pattern="\d{4}"
      maxLength={4}
      autoFocus={autoFocus}
      autoComplete="off"
      className="h-12 rounded-md text-center text-2xl font-extrabold tracking-[0.5em] tabular-nums"
      placeholder="••••"
    />
  );
}

function SetupForm({ onSetup }: { onSetup: (pin: string) => Promise<void> }) {
  const [p1, setP1] = useState('');
  const [p2, setP2] = useState('');
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    ref.current?.focus();
  }, []);

  async function submit() {
    if (p1.length !== 4) {
      toast.error('숫자 4자리를 입력하세요');
      return;
    }
    if (p1 !== p2) {
      toast.error('두 번 입력한 값이 달라요');
      return;
    }
    setBusy(true);
    try {
      await onSetup(p1);
    } catch (err) {
      // 이전에는 조용히 실패해 Dialog가 그대로 남아 있었다.
      // 사용자에게 원인을 명시적으로 알린다.
      const msg =
        err instanceof Error && err.message
          ? err.message
          : 'PIN을 저장하지 못했어요.';
      toast.error(`설정 실패: ${msg}`);
      // eslint-disable-next-line no-console
      console.error('[parental-pin] setup failed:', err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mx-auto max-w-md space-y-4 rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
      <div>
        <h2 className="text-xl font-bold">보호자 모드 설정</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          아이가 실수로 들어오지 않도록, 숫자 4자리 보호자 PIN을 만들어 주세요.
          PIN은 이 기기에만 저장되며 서버로 전송되지 않아요.
        </p>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="pin1">PIN (숫자 4자리)</Label>
        <PinInput id="pin1" value={p1} onChange={setP1} />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="pin2">한 번 더 입력</Label>
        <PinInput id="pin2" value={p2} onChange={setP2} />
      </div>
      <Button
        onClick={submit}
        disabled={busy || p1.length !== 4 || p2.length !== 4}
        className="w-full rounded-md"
        size="lg"
      >
        {busy ? '저장 중…' : 'PIN 설정'}
      </Button>
    </section>
  );
}

function VerifyForm({
  onVerify,
  onReset,
}: {
  onVerify: (pin: string) => Promise<boolean>;
  onReset: () => void;
}) {
  const [pin, setPin] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (pin.length !== 4) return;
    setBusy(true);
    try {
      const ok = await onVerify(pin);
      if (!ok) setPin('');
    } catch (err) {
      const msg =
        err instanceof Error && err.message
          ? err.message
          : 'PIN을 확인하지 못했어요.';
      toast.error(`확인 실패: ${msg}`);
      // eslint-disable-next-line no-console
      console.error('[parental-pin] verify failed:', err);
      setPin('');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mx-auto max-w-md space-y-4 rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
      <div>
        <h2 className="text-xl font-bold">보호자 PIN</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          학습 리포트를 보려면 설정한 PIN 4자리를 입력해 주세요.
        </p>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <PinInput value={pin} onChange={setPin} autoFocus />
        <Button
          type="submit"
          disabled={busy || pin.length !== 4}
          className="mt-4 w-full rounded-md"
          size="lg"
        >
          {busy ? '확인 중…' : '잠금 해제'}
        </Button>
      </form>
      <div className="pt-2 text-center">
        <button
          type="button"
          onClick={onReset}
          className="text-xs text-muted-foreground underline-offset-2 hover:underline"
        >
          PIN을 잊어버렸어요 (초기화)
        </button>
      </div>
    </section>
  );
}
