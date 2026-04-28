import type { Metadata } from "next";
import { AlertCircle, BookOpen } from "lucide-react";

import { SiteHeader } from "@/components/site-header";
import { PlanComparison } from "@/components/subscribe/plan-comparison";
import { PricingSection } from "@/components/subscribe/pricing-section";

export const metadata: Metadata = {
  title: "별 충전 · 하루책",
  description:
    "별 1개 = 동화 1권. 별 50개 9,900원(권당 198원), 별 600개 89,000원. 만료 없음 · 가족 합산. 원어민 낭독, 한글 해석, 단어장 복습, 주간 리포트 포함.",
};

/**
 * 별(⭐) 크레딧 충전 페이지(Server Component).
 * 패키지 카드는 인터랙션이 필요하므로 PricingSection(클라이언트)에 분리.
 * metadata export는 Server 컴포넌트에서만 SEO에 반영되므로 page는 Server로 유지.
 */
export default function SubscribePage() {
  return (
    <div className="min-h-dvh bg-background">
      <SiteHeader />

      <main className="mx-auto w-full max-w-6xl space-y-12 px-4 pb-24 pt-10 sm:px-6 sm:pt-14">
        <section className="flex flex-col items-center gap-6 text-center">
          <span className="inline-flex size-12 items-center justify-center rounded-2xl bg-primary/15 text-primary ring-1 ring-primary/25">
            <BookOpen className="size-6" strokeWidth={2.2} />
          </span>
          <div className="max-w-2xl space-y-3">
            <h1 className="font-heading text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">
              아이의 영어 여정을
              <br className="hidden sm:inline" />
              든든하게 함께해요
            </h1>
            <p className="text-base text-muted-foreground sm:text-lg">
              필요한 만큼만 충전하세요. 별은 만료되지 않고, 가족이 함께 써요.
              <br />
              자동결제·해지 걱정 없이.
            </p>
          </div>
        </section>

        <section
          aria-label="환불 정책 안내"
          className="rounded-xl border border-amber-300 bg-amber-50 p-4 sm:p-5"
        >
          <div className="flex items-start gap-3">
            <AlertCircle
              aria-hidden
              className="mt-0.5 size-5 shrink-0 text-amber-600"
              strokeWidth={2.4}
            />
            <div className="space-y-1.5">
              <p className="text-base font-semibold tracking-tight text-stone-900">
                결제 전 꼭 확인해 주세요 — 환불 불가 정책
              </p>
              <p className="text-sm leading-relaxed text-stone-800">
                별은 충전 후 즉시 디지털 콘텐츠(동화 생성)에 사용할 수 있는
                재화로,{" "}
                <strong className="font-semibold text-stone-900 underline decoration-amber-500 decoration-2 underline-offset-2">
                  환불이 불가
                </strong>
                해요. 결제 전 패키지·수량을 다시 한번 확인해 주세요. 결제
                오류·중복 결제 등 결제 자체에 문제가 발생한 경우에만 별도
                안내를 통해 처리해 드려요.
              </p>
            </div>
          </div>
        </section>

        <PricingSection />

        <PlanComparison />

        <section
          aria-labelledby="faq-title"
          className="rounded-3xl border border-border bg-card/80 p-5 shadow-sm sm:p-7"
        >
          <h2
            id="faq-title"
            className="font-heading text-xl font-bold tracking-tight"
          >
            자주 묻는 질문
          </h2>
          <dl className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {FAQS.map((faq) => (
              <div key={faq.q} className="space-y-1.5">
                <dt className="text-sm font-semibold text-foreground">{faq.q}</dt>
                <dd className="text-sm leading-relaxed text-muted-foreground">
                  {faq.a}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      </main>
    </div>
  );
}

const FAQS = [
  {
    q: "별은 어떻게 사용하나요?",
    a: "별 1개로 새 동화 한 편을 만들 수 있어요. 동화를 만들 때마다 별 1개가 차감되고, 차감된 별은 충전한 다른 별로 바로 채워서 다시 만드시면 돼요.",
  },
  {
    q: "별에는 유효기간이 있나요?",
    a: "아니요, 별은 만료되지 않아요. 한 번 충전하시면 잔액이 0이 될 때까지 언제든 자유롭게 사용할 수 있어요.",
  },
  {
    q: "자동결제나 정기구독인가요?",
    a: "아니에요. 별 충전은 그때그때 한 번씩 결제하는 방식이라 자동결제도, 해지 절차도 없어요. 필요할 때만 원하는 팩을 골라 충전하시면 돼요.",
  },
  {
    q: "만든 책은 별을 다 써도 계속 볼 수 있나요?",
    a: "네, 한 번 만드신 책은 프로필 책장에 영구 보관돼요. 낭독 · 퀴즈 · 한글 해석 모두 별 잔액과 무관하게 다시 볼 수 있어요.",
  },
  {
    q: "별은 가족이 같이 쓸 수 있나요?",
    a: "네, 별 잔액은 가족 계정 단위로 합산돼요. 한 계정에 등록된 2~3명의 아이 프로필이 같은 잔액을 공유합니다.",
  },
  {
    q: "결제 수단은 무엇이 있나요?",
    a: "카드 결제를 지원해요(포트원 결제 모듈 경유). 결제 후 영수증은 결제 완료 화면과 보호자 모드에서 다시 확인하실 수 있어요.",
  },
  {
    q: "환불이 가능한가요?",
    a: "별은 충전 즉시 사용 가능한 디지털 재화 특성상 환불이 불가해요. 결제 오류·중복 결제처럼 결제 자체에 문제가 있는 경우에만 보호자 이메일로 문의 주시면 개별 안내해 드려요.",
  },
];
