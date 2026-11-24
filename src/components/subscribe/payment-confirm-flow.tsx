"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Sparkles } from "lucide-react";

import { Mascot } from "@/components/haru";
import { apiFetch, ApiError } from "@/lib/api-client";
import { STAR_PACKAGES, formatKrw } from "@/lib/billing/packages";
import { APP_HOME } from "@/lib/paths";

interface ConfirmResponse {
  ok: true;
  already: boolean;
  stars: number;
  receiptUrl: string | null;
}

type Phase =
  | { kind: "verifying" }
  | { kind: "success"; stars: number; receiptUrl: string | null }
  | { kind: "error"; message: string };

/** API error 코드 → 사용자에게 보일 메시지 매핑. 원문 노출 방지. */
function friendlyConfirmErrorMessage(code: string | undefined): string {
  switch (code) {
    case "order_not_found":
      return "주문 정보를 찾을 수 없어요. 결제 페이지에서 다시 시도해 주세요.";
    case "validation":
      return "결제 정보 형식이 올바르지 않아요.";
    case "unauthorized":
      return "세션이 만료되었어요. 다시 로그인 후 시도해 주세요.";
    case "payment_not_paid":
      return "결제가 완료되지 않았어요. 다시 결제해 주세요.";
    case "invalid_receipt":
    case "order_mismatch":
      return "결제 정보가 일치하지 않아요. 고객센터로 문의해 주세요.";
    case "toss_confirm_failed":
      return "결제 승인 중 문제가 발생했어요. 잠시 후 다시 시도해 주세요.";
    case "amount_mismatch":
      return "결제 금액이 맞지 않아 결제가 취소됐어요. 다시 시도해 주세요.";
    default:
      return "결제 확인에 실패했어요. 잠시 후 다시 시도해 주세요.";
  }
}

/**
 * 토스 결제창 successUrl 리다이렉트로 붙은 파라미터(paymentKey/orderId/amount + pack)를
 * 받아 /api/payments/confirm 호출 → 서버가 토스 confirm(승인)으로 검증 후 적립.
 * (결제 실패·취소는 토스가 failUrl 로 직접 보내므로 이 성공 경로에는 도달하지 않는다.)
 *
 * 컴포넌트 마운트 1회만 호출(StrictMode 이중 마운트 방지: ref 가드).
 * confirm 라우트는 idempotent 하므로 안전하지만, 불필요한 호출을 줄인다.
 */
export function PaymentConfirmFlow() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // 파라미터 누락은 렌더 시점에 확정되는 파생 상태 — effect 내 setState(cascading render)를
  // 피하려 초기값으로 계산한다. 정상 파라미터면 verifying 으로 시작해 effect가 confirm 한다.
  const [phase, setPhase] = useState<Phase>(() => {
    const oid = searchParams.get("orderId");
    const pk = searchParams.get("paymentKey");
    const amt = Number(searchParams.get("amount"));
    return !oid || !pk || !Number.isFinite(amt)
      ? { kind: "error", message: "결제 정보가 누락되어 확인할 수 없어요." }
      : { kind: "verifying" };
  });
  const calledRef = useRef(false);

  // 토스 successUrl 파라미터. orderId 는 우리 서버가 발급한 paymentId(UUID).
  const orderId = searchParams.get("orderId");
  const paymentKey = searchParams.get("paymentKey");
  const amountParam = searchParams.get("amount");
  // 우리가 추가한 표시용 파라미터(없을 수도 있음).
  const packId = searchParams.get("pack");

  useEffect(() => {
    if (calledRef.current) return;
    calledRef.current = true;

    const amount = Number(amountParam);
    if (!orderId || !paymentKey || !Number.isFinite(amount)) {
      // 초기 phase 가 이미 error 로 설정됨 — effect 내 setState 없이 종료.
      return;
    }

    apiFetch<ConfirmResponse>("/api/payments/confirm", {
      method: "POST",
      body: JSON.stringify({ paymentId: orderId, paymentKey, amount }),
    })
      .then((res) => {
        setPhase({
          kind: "success",
          stars: res.stars,
          receiptUrl: res.receiptUrl,
        });
      })
      .catch((err: unknown) => {
        // 토스 원문 메시지(method/카드사 코드 등)는 클라이언트에 전달되지 않는다.
        // 사용자 친화 메시지는 friendlyConfirmErrorMessage()로 매핑.
        const apiBody = err instanceof ApiError ? err.body : undefined;
        const error = apiBody?.error;
        const tossCode = (apiBody as { code?: unknown } | undefined)?.code;
        if (
          error === "toss_confirm_failed" ||
          error === "amount_mismatch" ||
          error === "order_mismatch" ||
          error === "order_failed" ||
          error === "payment_not_paid"
        ) {
          const params = new URLSearchParams();
          params.set("error", error);
          if (typeof tossCode === "string" && tossCode.length > 0) {
            params.set("code", tossCode);
          }
          router.replace(`/subscribe/fail?${params.toString()}`);
          return;
        }
        setPhase({ kind: "error", message: friendlyConfirmErrorMessage(error) });
      });
  }, [orderId, paymentKey, amountParam, router]);

  // ---- 화면(그림책 세계 톤, 2026-09-30) — 위의 confirm 흐름은 그대로, 표현만 바꿨다. ----

  if (phase.kind === "verifying") {
    return (
      <div role="status" className="flex flex-col items-center gap-4 py-10 text-center animate-fade-up">
        <Mascot pose="reading" size={150} />
        <div className="space-y-2">
          <h1 className="text-2xl font-extrabold text-haru-ink sm:text-3xl">결제를 확인하고 있어요</h1>
          <p className="text-sm font-bold text-haru-muted">잠시만 기다려 주세요. 별이 잔액에 추가되고 있어요.</p>
        </div>
        <div aria-hidden className="w-48">
          <div className="shimmer h-2 w-full rounded-full" />
        </div>
      </div>
    );
  }

  if (phase.kind === "error") {
    return (
      <div className="flex flex-col items-center gap-5 text-center animate-fade-up">
        <Mascot pose="worried" size={150} />
        <div className="space-y-2">
          <h1 className="text-2xl font-extrabold text-haru-ink sm:text-3xl">결제 확인에 실패했어요</h1>
          <p className="text-sm font-bold text-haru-ink">{phase.message}</p>
          <p className="text-xs font-bold text-haru-muted">
            결제가 이미 처리되었다면 별 잔액을 확인하거나 고객센터로 문의해
            주세요.
          </p>
        </div>
        <div className="flex w-full flex-col gap-2.5 sm:w-auto sm:flex-row">
          <Link href="/subscribe" className={PRIMARY}>
            결제 페이지로 돌아가기
          </Link>
          <Link href={APP_HOME} className={SECONDARY}>
            책장으로
          </Link>
        </div>
      </div>
    );
  }

  const pack = STAR_PACKAGES.find((p) => p.id === packId);

  return (
    <div className="flex flex-col items-center gap-5 text-center">
      <Mascot pose="cheer" size={190} className="animate-pop-in max-sm:size-[160px]" />

      <div className="space-y-2 animate-fade-up">
        <h1 className="text-[28px] font-extrabold leading-tight text-haru-ink">
          별 {phase.stars.toLocaleString("ko-KR")}개가 도착했어요!
        </h1>
        <p className="text-sm font-bold text-haru-muted">
          {pack ? `${pack.name} (${formatKrw(pack.priceKrw)}) · ` : ""}새 동화가 기다리고 있어요
        </p>
      </div>

      <div className="flex w-full flex-col gap-2.5">
        <Link href={APP_HOME} className={PRIMARY}>
          <Sparkles aria-hidden className="size-5" />
          새 동화 만들러 가기
        </Link>
        {phase.receiptUrl ? (
          <a href={phase.receiptUrl} target="_blank" rel="noreferrer noopener" className={SECONDARY}>
            영수증 보기
          </a>
        ) : (
          <Link href="/parents" className={SECONDARY}>
            이용 내역 보기
          </Link>
        )}
      </div>

      <p className="text-xs font-bold text-haru-muted">
        책장 첫 칸의 &lsquo;새 동화 만들기&rsquo;를 누르면 돼요. 충전 내역과 영수증은 보호자 모드에서 다시 확인할 수 있어요.
      </p>
    </div>
  );
}

/** 코랄 채움 큰 버튼 / 테두리 버튼 — 결제 결과 화면 공용. */
const PRIMARY =
  "inline-flex min-h-[62px] items-center justify-center gap-2 rounded-full bg-haru-coral px-6 text-lg font-extrabold text-haru-on-coral shadow-[0_10px_20px_rgb(245_131_92/0.35)] transition-transform hover:-translate-y-0.5 active:scale-[0.98] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none";
const SECONDARY =
  "inline-flex min-h-[56px] items-center justify-center gap-2 rounded-full border-[2.5px] border-[#ebc9b6] bg-white/80 px-6 text-base font-extrabold text-haru-ink transition-transform active:scale-[0.98] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none";
