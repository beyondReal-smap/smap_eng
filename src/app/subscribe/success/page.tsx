import type { Metadata } from "next";
import { Suspense } from "react";

import { PaymentConfirmFlow } from "@/components/subscribe/payment-confirm-flow";

export const metadata: Metadata = {
  title: "충전 완료 · 하루책",
  description: "별 충전이 완료되었어요. 이제 아이의 첫 동화를 만나볼까요?",
};

// useSearchParams는 Suspense 경계 내에서만 사용 가능 — App Router 권장 패턴.
export default function SubscribeSuccessPage() {
  return (
    <div className="min-h-dvh">
      {/* 배경은 body의 그림책 벽지. 결과 화면은 한 손에 들어오는 가운데 좁은 칸(최대 420px). */}
      <main className="mx-auto flex min-h-dvh w-full max-w-[420px] flex-col items-center justify-center gap-8 px-4 py-12">
        <Suspense fallback={null}>
          <PaymentConfirmFlow />
        </Suspense>
      </main>
    </div>
  );
}
