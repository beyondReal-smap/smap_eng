import type { Metadata } from "next";
import { Suspense } from "react";

import { PaymentFailContent } from "@/components/subscribe/payment-fail-content";

export const metadata: Metadata = {
  title: "결제 실패 · 하루책",
  description: "결제 처리 중 오류가 발생했어요.",
};

export default function SubscribeFailPage() {
  return (
    <div className="min-h-dvh">
      {/* 배경은 body의 그림책 벽지. 결과 화면은 한 손에 들어오는 가운데 좁은 칸(최대 420px). */}
      <main className="mx-auto flex min-h-dvh w-full max-w-[420px] flex-col items-center justify-center gap-8 px-4 py-12">
        <Suspense fallback={null}>
          <PaymentFailContent />
        </Suspense>
      </main>
    </div>
  );
}
