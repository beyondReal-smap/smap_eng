import type { Metadata } from "next";
import { Suspense } from "react";

import { PaymentFailContent } from "@/components/subscribe/payment-fail-content";

export const metadata: Metadata = {
  title: "결제 실패 · 하루책",
  description: "결제 처리 중 오류가 발생했어요.",
};

export default function SubscribeFailPage() {
  return (
    <div className="min-h-dvh bg-background">
      <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col items-center justify-center gap-8 px-4 py-16 sm:px-6">
        <Suspense fallback={null}>
          <PaymentFailContent />
        </Suspense>
      </main>
    </div>
  );
}
