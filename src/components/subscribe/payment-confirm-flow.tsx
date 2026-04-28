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
    default:
      return "결제 확인에 실패했어요. 잠시 후 다시 시도해 주세요.";
  }
}

/**
 * 포트원 V2 redirect URL 파라미터(paymentId/code/message)를 받아
 * /api/payments/confirm 호출 → 서버가 포트원 GET /payments/{id} 로 검증 후 적립.
 *
 * code 분기:
 *  - "Success" 또는 미설정: 정상 흐름(포트원이 성공 시 code 미부착하는 경우 있음).
 *  - "Fail" 또는 그 외: /subscribe/fail 로 라우팅(클라이언트 측 1차 분기).
 *
 * 컴포넌트 마운트 1회만 호출(StrictMode 이중 마운트 방지: ref 가드).
 * confirm 라우트는 idempotent 하므로 안전하지만, 불필요한 호출을 줄인다.
 */
export function PaymentConfirmFlow() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [phase, setPhase] = useState<Phase>({ kind: "verifying" });
  const calledRef = useRef(false);

  const paymentId = searchParams.get("paymentId");
  const code = searchParams.get("code");
  const message = searchParams.get("message");
  // 우리가 추가한 표시용 파라미터(없을 수도 있음).
  const packId = searchParams.get("pack");

  useEffect(() => {
    if (calledRef.current) return;
    calledRef.current = true;

    // 포트원 redirect 시 결제 실패/취소면 code=Fail. 즉시 fail 라우트로.
    if (code && code !== "Success") {
      const params = new URLSearchParams();
      params.set("error", "portone_redirect_fail");
      params.set("code", code);
      if (message) params.set("message", message);
      router.replace(`/subscribe/fail?${params.toString()}`);
      return;
    }

    if (!paymentId) {
      setPhase({
        kind: "error",
        message: "결제 정보가 누락되어 확인할 수 없어요.",
      });
      return;
    }

    apiFetch<ConfirmResponse>("/api/payments/confirm", {
      method: "POST",
      body: JSON.stringify({ paymentId }),
    })
      .then((res) => {
        setPhase({
          kind: "success",
          stars: res.stars,
          receiptUrl: res.receiptUrl,
        });
      })
      .catch((err: unknown) => {
        // 포트원 원문 메시지(method/카드사 코드 등)는 클라이언트에 전달되지 않는다.
        // 사용자 친화 메시지는 friendlyConfirmErrorMessage()로 매핑.
        const apiBody = err instanceof ApiError ? err.body : undefined;
        const error = apiBody?.error;
        const portoneCode = (apiBody as { code?: unknown } | undefined)?.code;
        if (
          error === "portone_lookup_failed" ||
          error === "amount_mismatch_upstream" ||
          error === "order_failed" ||
          error === "payment_not_paid"
        ) {
          const params = new URLSearchParams();
          params.set("error", error);
          if (typeof portoneCode === "string" && portoneCode.length > 0) {
            params.set("code", portoneCode);
          }
          router.replace(`/subscribe/fail?${params.toString()}`);
          return;
        }
        setPhase({ kind: "error", message: friendlyConfirmErrorMessage(error) });
      });
  }, [paymentId, code, message, router]);

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
