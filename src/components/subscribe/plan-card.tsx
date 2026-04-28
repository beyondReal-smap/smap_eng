"use client";

import { Check, Loader2, Sparkles } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import * as PortOne from "@portone/browser-sdk/v2";

import { Button } from "@/components/ui/button";
import { formatKrw, type StarPackage } from "@/lib/billing/packages";
import { apiFetch, ApiError } from "@/lib/api-client";
import { cn } from "@/lib/utils";

/**
 * 단일 별 충전 패키지 카드.
 * 추천 패키지(highlighted)는 story gold 링 + 상단 배지로 강조.
 *
 * 결제 흐름(포트원 V2):
 *  1) /api/payments/checkout 으로 서버에서 paymentId·amount 발급(orders 'pending' INSERT).
 *  2) PortOne.requestPayment({ storeId, channelKey, paymentId, ... }) 로 결제창 띄우기.
 *  3) 포트원이 redirectUrl(/subscribe/success?paymentId=...&code=Success|Fail)로 리다이렉트.
 *     PC 환경에서는 redirectUrl 미설정 시 Promise 응답을 직접 받지만, 모바일/외부 결제앱
 *     복귀 안정성을 위해 redirectUrl 모드를 사용한다.
 *  4) success 페이지에서 /api/payments/confirm 호출 → 포트원 GET /payments/{id} 로
 *     서버 검증 후 별 적립.
 *
 * NEXT_PUBLIC_PORTONE_STORE_ID / NEXT_PUBLIC_PORTONE_CHANNEL_KEY 는 빌드 타임 inline.
 * 변경 시 pnpm build 재실행 필요.
 */

const PORTONE_STORE_ID = process.env.NEXT_PUBLIC_PORTONE_STORE_ID;
const PORTONE_CHANNEL_KEY = process.env.NEXT_PUBLIC_PORTONE_CHANNEL_KEY;

interface CheckoutResponse {
  paymentId: string;
  amount: number;
  orderName: string;
}

export function PlanCard({ pack }: { pack: StarPackage }) {
  const [processing, setProcessing] = useState(false);

  const handleSubscribe = async () => {
    if (!PORTONE_STORE_ID || !PORTONE_CHANNEL_KEY) {
      toast.error("결제 설정이 누락되어 있어요", {
        description: "관리자에게 문의해 주세요 (PORTONE 환경변수 미설정).",
      });
      return;
    }

    setProcessing(true);
    try {
      const checkout = await apiFetch<CheckoutResponse>(
        "/api/payments/checkout",
        {
          method: "POST",
          body: JSON.stringify({ packageId: pack.id }),
        },
      );

      const origin = window.location.origin;
      // redirectUrl 모드 — 모바일·외부 결제앱(카카오/네이버페이 등)에서 복귀 안정적.
      // 결제창 종료 후 /subscribe/success?paymentId=...&code=Success|Fail&message=... 로 이동.
      // requestPayment 는 보통 redirect 로 인해 반환되지 않지만, PC 환경/취소 등에서
      // Promise 가 resolve 되어 response 가 들어오는 경우가 있어 함께 처리한다.
      // 타입 단언 사유: @portone/browser-sdk@0.1.5 의 PaymentRequestUnion 타입에서
      // alipayPlus 필드만 잘못 required 로 정의되어 있어, CARD 결제 호출 시도 타입 에러가 난다.
      // 런타임에는 alipayPlus 가 없어도 정상 동작하므로 Parameters<...>[0] 단언으로 우회한다.
      const response = await PortOne.requestPayment({
        storeId: PORTONE_STORE_ID,
        channelKey: PORTONE_CHANNEL_KEY,
        paymentId: checkout.paymentId,
        orderName: checkout.orderName,
        totalAmount: checkout.amount,
        currency: "KRW",
        payMethod: "CARD",
        redirectUrl: `${origin}/subscribe/success`,
      } as Parameters<typeof PortOne.requestPayment>[0]);

      // PC 환경에서 redirect 가 실행되지 않고 Promise 가 resolve 된 경우.
      // - response.code 가 truthy 면 결제 실패/취소 → fail 라우트로 이동
      // - 정상 결제 시에는 redirectUrl 로 이미 이동했거나, response.paymentId 만 채워져 옴
      if (response?.code) {
        const params = new URLSearchParams({
          paymentId: checkout.paymentId,
          code: "Fail",
          message: response.message ?? response.code,
        });
        window.location.href = `${origin}/subscribe/fail?${params.toString()}`;
        return;
      }
      if (response?.paymentId) {
        window.location.href = `${origin}/subscribe/success?paymentId=${encodeURIComponent(response.paymentId)}&code=Success`;
        return;
      }
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.body?.message ?? err.message
          : err instanceof Error
            ? err.message
            : "결제를 시작하지 못했어요";
      toast.error("결제 시작 실패", { description: message });
      setProcessing(false);
    }
  };

  return (
    <article
      className={cn(
        "relative flex h-full flex-col gap-6 rounded-3xl border bg-card/80 p-6 shadow-sm transition-all sm:p-7",
        "animate-fade-up",
        pack.highlighted
          ? "border-primary/60 ring-2 ring-primary/50 shadow-md"
          : "border-border hover:border-foreground/20",
      )}
      aria-labelledby={`pack-${pack.id}-title`}
    >
      {pack.highlighted && (
        <span
          className={cn(
            "absolute -top-3 left-1/2 -translate-x-1/2",
            "inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1",
            "text-[11px] font-extrabold uppercase tracking-wider text-primary-foreground shadow-sm",
          )}
        >
          <Sparkles className="size-3" strokeWidth={2.5} />
          가장 인기
        </span>
      )}

      <header className="space-y-1.5">
        <h3
          id={`pack-${pack.id}-title`}
          className="font-heading text-lg font-bold tracking-tight"
        >
          {pack.name}
        </h3>
        <p className="text-sm text-muted-foreground">{pack.tagline}</p>
      </header>

      <div className="flex flex-col gap-1">
        <div className="flex items-baseline gap-1.5">
          <span className="font-heading text-4xl font-extrabold tracking-tight">
            {formatKrw(pack.priceKrw)}
          </span>
          <span className="text-sm font-medium text-muted-foreground">
            / 별 {pack.stars.toLocaleString("ko-KR")}개
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          권당 {formatKrw(pack.perStarKrw)} · 만료 없음 · 가족 합산
        </p>
      </div>

      <ul className="flex flex-1 flex-col gap-2.5 text-sm">
        {pack.features.map((feature) => (
          <li key={feature} className="flex items-start gap-2">
            <span
              className={cn(
                "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full",
                pack.highlighted
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-foreground",
              )}
              aria-hidden
            >
              <Check className="size-3" strokeWidth={3} />
            </span>
            <span className="leading-relaxed">{feature}</span>
          </li>
        ))}
      </ul>

      <div className="flex flex-col gap-2">
        <Button
          type="button"
          onClick={handleSubscribe}
          disabled={processing}
          variant={pack.highlighted ? "complete" : "outline"}
          size="lg"
          className="h-11 w-full text-base font-semibold"
          aria-label={`${pack.name} ${pack.cta}`}
        >
          {processing ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              결제 준비 중…
            </>
          ) : (
            pack.cta
          )}
        </Button>
        <p className="text-center text-[11px] text-muted-foreground">
          결제 시{" "}
          <span className="font-medium text-foreground/80">환불 불가</span>{" "}
          정책에 동의한 것으로 간주돼요.
        </p>
      </div>
    </article>
  );
}
