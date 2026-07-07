"use client";

import { Check, Loader2, Sparkles } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { apiFetch, ApiError } from "@/lib/api-client";
import { formatKrw, type StarPackage } from "@/lib/billing/packages";
import {
  APP_STORE_URL,
  PLAY_STORE_URL,
  detectMobilePlatform,
  isInAppWebView,
} from "@/lib/billing/store-links";
import { cn } from "@/lib/utils";

/**
 * 단일 별 충전 패키지 카드.
 * 추천 패키지(highlighted)는 story gold 링 + 상단 배지로 강조.
 *
 * 충전 흐름:
 *  1) 일반 웹 브라우저 — 서버 checkout(주문 생성) → 토스 결제창(리다이렉트) →
 *     successUrl(/subscribe/success)에서 서버 confirm(승인·검증·적립).
 *  2) 인앱 웹뷰(App Store 3.1.1) — 결제창 대신 앱 스토어로 유도(앱은 IAP로 충전).
 *     - iOS  → App Store (NEXT_PUBLIC_APP_STORE_URL)
 *     - Android → Google Play (NEXT_PUBLIC_PLAY_STORE_URL)
 *     - OS 미감지(데스크톱 웹뷰 등) → 두 스토어 버튼 선택 모달
 *  3) 결제 미설정(checkout 503) — 스토어 유도로 폴백.
 *
 * 스토어 URL 환경변수는 빌드 타임 inline. 변경 시 pnpm build 재실행 필요.
 */

interface CheckoutResponse {
  paymentId: string;
  amount: number;
  orderName: string;
  clientKey: string;
  customerKey: string;
}

export function PlanCard({ pack }: { pack: StarPackage }) {
  // 데스크톱 등 OS 미감지 시 스토어 선택 모달 표시.
  const [storePickerOpen, setStorePickerOpen] = useState(false);
  // 결제 진행 중 — 중복 클릭 차단 + 버튼 로딩 표시.
  const [processing, setProcessing] = useState(false);

  /** 단일 스토어로 이동. URL 미설정 시 토스트 안내 후 false 반환. */
  const goToStore = (url: string, label: string): boolean => {
    if (!url) {
      toast.error(`${label} 링크가 아직 준비 중이에요`, {
        description: "앱 출시 후 이용할 수 있어요.",
      });
      return false;
    }
    window.location.href = url;
    return true;
  };

  /** 인앱 웹뷰/결제 미설정 시 폴백 — OS별 스토어 유도(데스크톱은 선택 모달). */
  const goToStoreFallback = () => {
    const platform = detectMobilePlatform();
    if (platform === "ios") {
      goToStore(APP_STORE_URL, "App Store");
      return;
    }
    if (platform === "android") {
      goToStore(PLAY_STORE_URL, "Google Play");
      return;
    }
    setStorePickerOpen(true);
  };

  const handlePurchase = async () => {
    // 인앱 웹뷰(App Store 3.1.1)에서는 웹 결제창을 띄우지 않고 스토어로 유도.
    if (isInAppWebView()) {
      goToStoreFallback();
      return;
    }
    if (processing) return;
    setProcessing(true);
    try {
      // 1) 서버에서 주문 생성 + clientKey/customerKey/금액 수신 (금액은 서버가 SSOT).
      const checkout = await apiFetch<CheckoutResponse>(
        "/api/payments/checkout",
        {
          method: "POST",
          body: JSON.stringify({ packageId: pack.id }),
        },
      );

      // 2) 토스 결제창 — SDK는 무겁고 결제 시에만 필요하므로 동적 import.
      //    리다이렉트 방식이라 인증 성공 시 successUrl(/subscribe/success)로 이동하고,
      //    서버 confirm(승인·검증·적립)은 그 페이지의 PaymentConfirmFlow가 수행한다.
      const { loadTossPayments } = await import("@tosspayments/tosspayments-sdk");
      const tossPayments = await loadTossPayments(checkout.clientKey);
      const payment = tossPayments.payment({ customerKey: checkout.customerKey });
      const origin = window.location.origin;
      await payment.requestPayment({
        method: "CARD",
        amount: { currency: "KRW", value: checkout.amount },
        orderId: checkout.paymentId, // 서버 발급 UUID — confirm 시 대조.
        orderName: checkout.orderName,
        successUrl: `${origin}/subscribe/success?pack=${encodeURIComponent(pack.id)}`,
        failUrl: `${origin}/subscribe/fail`,
      });
      // 성공 시 위에서 successUrl 로 리다이렉트되므로 이 아래는 실행되지 않는다.
    } catch (err) {
      // 사용자가 결제창을 닫으면 code=USER_CANCEL/PAY_PROCESS_CANCELED — 오류 아님.
      const code = (err as { code?: string })?.code;
      if (code === "USER_CANCEL" || code === "PAY_PROCESS_CANCELED") return;
      // 결제 미설정(503) — 스토어 유도로 폴백.
      if (err instanceof ApiError && err.status === 503) {
        goToStoreFallback();
        return;
      }
      console.error("[plan-card] purchase failed", err);
      toast.error("결제 중 문제가 발생했어요. 잠시 후 다시 시도해 주세요.");
    } finally {
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
          onClick={handlePurchase}
          disabled={processing}
          variant={pack.highlighted ? "complete" : "outline"}
          size="lg"
          className="h-11 w-full text-base font-semibold"
          aria-label={`${pack.name} 충전하기`}
        >
          {processing ? (
            <>
              <Loader2 className="size-4 animate-spin" strokeWidth={2.5} />
              결제 준비 중…
            </>
          ) : (
            pack.cta
          )}
        </Button>
        <p className="text-center text-[11px] text-muted-foreground">
          카드 결제 · 충전 후 환불 불가
        </p>
      </div>

      {/* 데스크톱 등 OS 미감지 시 — 스토어 선택 모달 */}
      <Dialog open={storePickerOpen} onOpenChange={setStorePickerOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>앱에서 충전하기</DialogTitle>
            <DialogDescription>
              별 충전은 하루책 앱에서 진행돼요. 사용하시는 기기의 스토어를
              선택해 주세요.
            </DialogDescription>
          </DialogHeader>
          {/* 로그인 화면(social-login-buttons)과 동일한 pill + sticker-shadow 톤 */}
          <div className="flex flex-col gap-2.5">
            <button
              type="button"
              onClick={() => goToStore(APP_STORE_URL, "App Store")}
              className={cn(
                "group relative flex h-12 w-full items-center justify-center gap-3 rounded-full px-5 font-semibold sticker-shadow",
                "bg-[#000000] text-white transition-all hover:-translate-y-[1px] hover:bg-[#1a1a1a] active:translate-y-0",
                "focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-foreground/40",
              )}
              aria-label="App Store에서 하루책 받기 (iPhone · iPad)"
            >
              <AppleIcon className="size-5" />
              <span>App Store</span>
            </button>
            <button
              type="button"
              onClick={() => goToStore(PLAY_STORE_URL, "Google Play")}
              className={cn(
                "group relative flex h-12 w-full items-center justify-center gap-3 rounded-full px-5 font-semibold sticker-shadow",
                "border-2 border-border bg-background text-foreground transition-all hover:-translate-y-[1px] hover:bg-muted active:translate-y-0",
                "focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
              )}
              aria-label="Google Play에서 하루책 받기 (Android)"
            >
              <GooglePlayIcon className="size-5" />
              <span>Google Play</span>
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </article>
  );
}

/** Apple 공식 로고 (Wikimedia Commons, Apple Inc.). 단색 — currentColor 상속(검정 버튼 위 흰색). */
function AppleIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 814 1000"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76.5 0-103.7 40.8-165.9 40.8s-105.6-57-155.5-127C46.7 790.7 0 663 0 541.8c0-194.4 126.4-297.5 250.8-297.5 66.1 0 121.2 43.4 162.7 43.4 39.5 0 101.1-46 176.3-46 28.5 0 130.9 2.6 198.3 99.2zm-234-181.5c31.1-36.9 53.1-88.1 53.1-139.3 0-7.1-.6-14.3-1.9-20.1-50.6 1.9-110.8 33.7-147.1 75.8-28.5 32.4-55.1 83.6-55.1 135.5 0 7.8 1.3 15.6 1.9 18.1 3.2.6 8.4 1.3 13.6 1.3 45.4 0 102.5-30.4 135.5-71.3z" />
    </svg>
  );
}

/** Google Play 공식 4색 로고 (Wikimedia Commons, Google LLC). */
function GooglePlayIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="30 336.7 120.9 129.2"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        fill="#FFD400"
        d="M119.2,421.2c15.3-8.4,27-14.8,28-15.3c3.2-1.7,6.5-6.2,0-9.7c-2.1-1.1-13.4-7.3-28-15.3l-20.1,20.2L119.2,421.2z"
      />
      <path
        fill="#FF3333"
        d="M99.1,401.1l-64.2,64.7c1.5,0.2,3.2-0.2,5.2-1.3c4.2-2.3,48.8-26.7,79.1-43.3L99.1,401.1L99.1,401.1z"
      />
      <path
        fill="#48FF48"
        d="M99.1,401.1l20.1-20.2c0,0-74.6-40.7-79.1-43.1c-1.7-1-3.6-1.3-5.3-1L99.1,401.1z"
      />
      <path
        fill="#3BCCFF"
        d="M99.1,401.1l-64.3-64.3c-2.6,0.6-4.8,2.9-4.8,7.6c0,7.5,0,107.5,0,113.8c0,4.3,1.7,7.4,4.9,7.7L99.1,401.1z"
      />
    </svg>
  );
}
