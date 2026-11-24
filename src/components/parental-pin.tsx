'use client';

import { useEffect, useRef, useState } from 'react';
import { Lock } from 'lucide-react';
import { toast } from 'sonner';
import { Mascot } from '@/components/haru';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useParentalPin } from '@/lib/hooks/use-parental-pin';

// 그림책 세계 톤(웹 3단계) — PIN 규칙·저장 방식은 그대로, 모양만.
const PIN_CARD =
  'mx-auto max-w-md space-y-4 rounded-[24px] bg-white p-6 shadow-[0_8px_20px_rgb(168_111_63/0.12)]';
const PIN_BUTTON =
  'inline-flex min-h-[56px] w-full items-center justify-center rounded-full bg-haru-coral text-base font-extrabold text-haru-on-coral shadow-[0_8px_16px_rgb(245_131_92/0.3)] transition-transform active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-60 disabled:shadow-none motion-reduce:transition-none';

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
    return <div className="mx-auto h-72 max-w-md animate-pulse rounded-[24px] bg-white/60 motion-reduce:animate-none" />;
  }
  if (pin.unlocked) {
    return (
      <>
        <div className="mb-4 flex items-center justify-between gap-3 rounded-full bg-white/80 py-1 pl-4 pr-1 shadow-[0_3px_8px_rgb(168_111_63/0.08)]">
          <span className="inline-flex items-center gap-1.5 text-[13px] font-bold text-haru-muted">
            <Lock aria-hidden className="size-3.5" />
            보호자 모드 · 30분 뒤 자동으로 잠겨요
          </span>
          <button
            type="button"
            onClick={pin.lock}
            className="min-h-11 rounded-full px-3.5 text-[13px] font-extrabold text-haru-coral-ink hover:bg-haru-coral-soft focus-visible:outline-2 focus-visible:outline-ring"
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
      className="h-14 rounded-2xl border-2 border-haru-line bg-haru-paper text-center text-2xl font-extrabold tracking-[0.5em] tabular-nums"
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
    <section className={PIN_CARD}>
      <div className="flex flex-col items-center text-center">
        <Mascot pose="normal" size={96} />
        <h2 className="mt-1 text-xl font-extrabold text-haru-ink">보호자 모드 설정</h2>
        <p className="mt-1 text-sm font-bold leading-relaxed text-haru-muted">
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
      <button
        type="button"
        onClick={submit}
        disabled={busy || p1.length !== 4 || p2.length !== 4}
        className={PIN_BUTTON}
      >
        {busy ? '저장 중…' : 'PIN 설정'}
      </button>
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
    <section className={PIN_CARD}>
      <div className="flex flex-col items-center text-center">
        <Mascot pose="normal" size={96} />
        <h2 className="mt-1 text-xl font-extrabold text-haru-ink">보호자 PIN</h2>
        <p className="mt-1 text-sm font-bold leading-relaxed text-haru-muted">
          학습 리포트를 보려면 설정한 PIN 4자리를 입력해 주세요.
        </p>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        {/* 입력칸에 이름이 없던 접근성 공백 보완 — 화면에는 위 안내문이 같은 뜻을 전한다. */}
        <Label htmlFor="pin-verify" className="sr-only">보호자 PIN 4자리</Label>
        <PinInput id="pin-verify" value={pin} onChange={setPin} autoFocus />
        <button
          type="submit"
          disabled={busy || pin.length !== 4}
          className={`${PIN_BUTTON} mt-4`}
        >
          {busy ? '확인 중…' : '잠금 해제'}
        </button>
      </form>
      <div className="pt-2 text-center">
        <button
          type="button"
          onClick={onReset}
          className="min-h-11 px-2 text-xs font-bold text-haru-muted underline underline-offset-2 hover:text-haru-ink focus-visible:outline-2 focus-visible:outline-ring"
        >
          PIN을 잊어버렸어요 (초기화)
        </button>
      </div>
    </section>
  );
}
