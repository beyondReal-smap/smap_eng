"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AlertTriangle, Home, RefreshCw } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { APP_HOME } from "@/lib/paths";
import { cn } from "@/lib/utils";

/**
 * 결제 실패 페이지.
 *
 * 진입 경로(포트원 V2):
 *  1) 포트원 결제창에서 사용자가 취소/실패 → redirectUrl=/subscribe/success 로 가지만
 *     `?code=Fail&message=...` 가 붙어 success 페이지가 이 fail 라우트로 replace.
 *  2) /api/payments/confirm 이 4xx/5xx → success 페이지가 라우터 replace 로 진입.
 *
 * 환불 정책: 환불 불가. 결제가 실제로 성공했지만 confirm 이 실패한 케이스는
 * 운영자가 포트원 콘솔에서 수동 확인 후 별 적립 처리.
 */
/**
 * 결제 에러 코드 → 사용자 친화 메시지.
 * PG/포트원이 보낸 message 원문은 카드사·내부 거래 ID 등 민감 정보를 포함할 수
 * 있어 표시하지 않는다.
 */
function friendlyErrorMessage(code: string): string {
  switch (code) {
    case "Fail":
    case "PAY_PROCESS_CANCELED":
    case "USER_CANCEL":
    case "USER_CANCELED":
      return "결제 창에서 결제를 취소하셨어요. 다시 시도하실 수 있어요.";
    case "PAY_PROCESS_ABORTED":
      return "결제가 중단되었어요. 다시 시도해 주세요.";
    case "REJECT_CARD_COMPANY":
    case "INVALID_CARD_EXPIRATION":
    case "EXCEED_MAX_DAILY_PAYMENT_COUNT":
    case "EXCEED_MAX_PAYMENT_AMOUNT":
      return "카드사에서 결제를 거절했어요. 다른 카드 또는 결제 수단을 사용해 보세요.";
    case "amount_mismatch_upstream":
      return "결제 금액 검증 중 문제가 발생했어요. 결제는 처리되지 않았어요.";
    case "order_failed":
      return "이미 처리에 실패한 주문이에요. 결제 페이지에서 새로 시작해 주세요.";
    case "payment_not_paid":
      return "결제가 완료 처리되지 않았어요. 다시 시도해 주세요.";
    case "portone_redirect_fail":
    case "portone_lookup_failed":
      return "결제 검증 중 문제가 발생했어요. 잠시 후 다시 시도해 주세요.";
    default:
      return "결제가 정상적으로 처리되지 않았어요.";
  }
}

export function PaymentFailContent() {
  const searchParams = useSearchParams();
  const code = searchParams.get("code") ?? "";
  const errorKey = searchParams.get("error") ?? "";
  const displayCode = code || errorKey;
  const message = friendlyErrorMessage(displayCode);

  const isUserCancel =
    code === "Fail" ||
    code === "PAY_PROCESS_CANCELED" ||
    code === "USER_CANCEL" ||
    code === "USER_CANCELED";
  const title = isUserCancel ? "결제가 취소되었어요" : "결제에 실패했어요";

  return (
    <div className="flex flex-col items-center gap-6 text-center animate-fade-up">
      <span
        aria-hidden
        className="inline-flex size-16 items-center justify-center rounded-full bg-destructive/15 text-destructive ring-4 ring-destructive/10"
      >
        <AlertTriangle className="size-8" strokeWidth={2.2} />
      </span>

      <div className="space-y-3">
        <h1 className="font-heading text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">
          {title}
        </h1>
        <p className="text-base text-muted-foreground">{message}</p>
        {displayCode ? (
          <p
            className="font-mono text-xs text-muted-foreground"
            aria-label="에러 코드"
          >
            오류 코드: {displayCode}
          </p>
        ) : null}
        {!isUserCancel ? (
          <p className="text-xs text-muted-foreground">
            카드사·결제 수단 문제일 수 있어요. 잠시 후 다시 시도해 주세요.
            <br />문제가 계속되면 보호자 이메일로 문의 주시면 빠르게 도와드릴게요.
          </p>
        ) : null}
      </div>

      <div className="flex w-full flex-col gap-2.5 sm:flex-row sm:justify-center">
        <Link
          href="/subscribe"
          className={cn(
            buttonVariants({ variant: "complete", size: "lg" }),
            "h-12 px-6 text-base",
          )}
        >
          <RefreshCw className="size-4" />
          다시 결제하기
        </Link>
        <Link
          href={APP_HOME}
          className={cn(
            buttonVariants({ variant: "outline", size: "lg" }),
            "h-12 px-6 text-base",
          )}
        >
          <Home className="size-4" />
          홈으로
        </Link>
      </div>
    </div>
  );
}
