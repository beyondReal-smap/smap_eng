"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  Loader2,
} from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { apiFetch, ApiError } from "@/lib/api-client";
import { STAR_PACKAGES, formatKrw } from "@/lib/billing/packages";
import { APP_HOME } from "@/lib/paths";
import { cn } from "@/lib/utils";

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

  if (phase.kind === "verifying") {
    return (
      <div className="flex flex-col items-center gap-6 py-10 text-center animate-fade-up">
        <Loader2
          aria-hidden
          className="size-10 animate-spin text-primary"
          strokeWidth={2.4}
        />
        <div className="space-y-2">
          <h1 className="font-heading text-2xl font-extrabold tracking-tight sm:text-3xl">
            결제를 확인하고 있어요
          </h1>
          <p className="text-sm text-muted-foreground">
            잠시만 기다려 주세요. 별이 잔액에 추가되고 있어요.
          </p>
        </div>
      </div>
    );
  }

  if (phase.kind === "error") {
    return (
      <div className="flex flex-col items-center gap-6 text-center animate-fade-up">
        <span
          aria-hidden
          className="inline-flex size-16 items-center justify-center rounded-full bg-destructive/15 text-destructive ring-4 ring-destructive/10"
        >
          <AlertCircle className="size-8" strokeWidth={2.2} />
        </span>
        <div className="space-y-2">
          <h1 className="font-heading text-2xl font-extrabold tracking-tight sm:text-3xl">
            결제 확인에 실패했어요
          </h1>
          <p className="text-sm text-muted-foreground">{phase.message}</p>
          <p className="text-xs text-muted-foreground">
            결제가 이미 처리되었다면 별 잔액을 확인하거나 고객센터로 문의해
            주세요.
          </p>
        </div>
        <div className="flex flex-col gap-2.5 sm:flex-row">
          <Link
            href="/subscribe"
            className={cn(
              buttonVariants({ variant: "complete", size: "lg" }),
              "h-11 px-5 text-sm",
            )}
          >
            결제 페이지로 돌아가기
          </Link>
          <Link
            href={APP_HOME}
            className={cn(
              buttonVariants({ variant: "outline", size: "lg" }),
              "h-11 px-5 text-sm",
            )}
          >
            홈으로
          </Link>
        </div>
      </div>
    );
  }

  const pack = STAR_PACKAGES.find((p) => p.id === packId);

  return (
    <div className="flex flex-col items-center gap-8 text-center">
      <span
        aria-hidden
        className="inline-flex size-16 items-center justify-center rounded-full bg-primary/15 text-primary ring-4 ring-primary/10 animate-pop-in"
      >
        <CheckCircle2 className="size-8" strokeWidth={2.2} />
      </span>

      <div className="space-y-3 animate-fade-up">
        <h1 className="font-heading text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">
          별이 충전됐어요!
        </h1>
        <p className="text-base text-muted-foreground">
          {pack
            ? `${pack.name} (${formatKrw(pack.priceKrw)}) · 별 ${phase.stars.toLocaleString("ko-KR")}개가 잔액에 추가되었어요.`
            : `별 ${phase.stars.toLocaleString("ko-KR")}개가 잔액에 추가되었어요.`}
          <br />이제 아이에게 딱 맞는 첫 동화를 만들어 드릴게요.
        </p>
      </div>

      <div className="flex w-full flex-col gap-2.5 sm:flex-row sm:justify-center">
        <Link
          href={APP_HOME}
          className={cn(
            buttonVariants({ variant: "complete", size: "lg" }),
            "h-12 px-6 text-base",
          )}
        >
          <BookOpen className="size-4" />
          동화 만들러 가기
        </Link>
        {phase.receiptUrl ? (
          <a
            href={phase.receiptUrl}
            target="_blank"
            rel="noreferrer noopener"
            className={cn(
              buttonVariants({ variant: "outline", size: "lg" }),
              "h-12 px-6 text-base",
            )}
          >
            영수증 보기
          </a>
        ) : (
          <Link
            href="/parents"
            className={cn(
              buttonVariants({ variant: "outline", size: "lg" }),
              "h-12 px-6 text-base",
            )}
          >
            이용 내역 보기
          </Link>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        충전 내역과 영수증은 보호자 모드에서 다시 확인할 수 있어요.
      </p>
    </div>
  );
}
