import type { Metadata } from "next";
import Link from "next/link";
import { AlertCircle, ChevronDown } from "lucide-react";

import { TAB_PAGE_SHELL, TabHeader } from "@/components/haru";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { PlanComparison } from "@/components/subscribe/plan-comparison";
import { PricingSection } from "@/components/subscribe/pricing-section";

export const metadata: Metadata = {
  title: "별 충전 · 하루책",
  description:
    "별 1개 = 동화 1권. 별 1개 1,100원, 별 60개 5,500원(권당 92원), 별 130개 11,000원. 만료 없음 · 가족 합산. 원어민 낭독, 한글 해석, 단어장 복습, 주간 리포트 포함.",
};

/**
 * 별(⭐) 크레딧 충전 페이지(Server Component) — 그림책 세계 "별 꾸러미"(2026-09-30).
 * 잔액 카드·꾸러미 선택·결제 버튼은 인터랙션이 필요하므로 PricingSection(클라이언트)에 분리.
 * 환불(청약철회권) 고지는 결제 버튼 바로 위에 항상 보이게 두고, 비교표·FAQ는 접어 둔다.
 * metadata export는 Server 컴포넌트에서만 SEO에 반영되므로 page는 Server로 유지.
 */
export default function SubscribePage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />

      <main className={TAB_PAGE_SHELL}>
        <TabHeader title="별 충전" />
        <p className="px-0.5 text-sm font-bold text-haru-muted">
          필요한 만큼만 충전해요. 별은 만료되지 않고 가족이 함께 써요 · 자동결제 없음
        </p>

        <div className="mt-5 grid gap-8 lg:grid-cols-[minmax(0,560px)_minmax(0,1fr)] lg:items-start lg:gap-10">
          <PricingSection
            notice={
              <>
          {/* 청약철회권 사전 고지 배너.
              ⚠️ 문구를 고칠 때는 반드시 /legal/refund(전자상거래법 §17 준거)와 대조할 것.
              그 정책 §2③은 "청약철회권을 행사할 수 있다는 사실을 결제 화면에 사전
              고지하며, 미고지 시 본 제한이 적용되지 않는다"고 규정한다. 즉 이 배너는
              '환불 불가 경고'가 아니라 **철회권 고지**가 목적이다. 과거 이 자리에
              "환불 불가 정책"이라 적혀 있어 정책 본문(7일 내 미사용 100% 환불)과
              정면으로 어긋났고, 사용분 제한을 주장할 법적 근거도 함께 약해졌다
              (2026-08-07 수정). 같은 사실을 말하는 곳: /legal/refund,
              src/lib/content/faq.ts(refund 항목), /pricing. */}
          <section
            aria-label="환불 정책 안내"
            className="rounded-[20px] border-2 border-[#f2c14e] bg-[#fff8e6] p-4 sm:p-5"
          >
            <div className="flex items-start gap-3">
              <AlertCircle
                aria-hidden
                className="mt-0.5 size-5 shrink-0 text-[#8a6300]"
                strokeWidth={2.4}
              />
              <div className="space-y-1.5">
                <p className="text-base font-semibold tracking-tight text-haru-ink">
                  결제 전 꼭 확인해 주세요 — 환불 안내
                </p>
                <p className="text-sm leading-relaxed text-haru-ink">
                  결제일로부터{" "}
                  <strong className="font-semibold text-haru-ink underline decoration-[#e8a317] decoration-2 underline-offset-2">
                    7일 이내
                  </strong>
                  에 별을 한 번도 쓰지 않으셨다면 결제 승인을 취소해 결제 금액을 환불해 드려요. 일부만
                  쓰셨다면 남은 별의 비율만큼 환불되고, 7일이 지난 뒤 남은 별은
                  결제대행 수수료 등을 공제하고 환불돼요. 다만{" "}
                  <strong className="font-semibold text-haru-ink">
                    이미 동화를 만드는 데 쓴 별
                  </strong>
                  은 그 즉시 외부 AI 호출 비용이 발생하므로 환불 대상에서
                  제외됩니다(전자상거래법 §17 ② 5호).
                </p>
                <p className="text-sm leading-relaxed text-haru-ink">
                  자세한 기준과 신청 방법은{" "}
                  <Link
                    href="/legal/refund"
                    className="font-semibold text-haru-ink underline underline-offset-2"
                  >
                    환불정책
                  </Link>
                  에서 확인하실 수 있어요.
                </p>
              </div>
            </div>
          </section>
              </>
            }
          />

          <div className="space-y-3">
            <details className="group rounded-[22px] bg-white/85 shadow-[0_3px_10px_rgb(168_111_63/0.08)] [&_summary::-webkit-details-marker]:hidden">
              <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 rounded-[22px] px-5 py-3 text-[15px] font-extrabold text-haru-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
                꾸러미 자세히 비교하기
                <ChevronDown aria-hidden className="size-5 shrink-0 transition-transform group-open:rotate-180 motion-reduce:transition-none" />
              </summary>
              <div className="px-2 pb-2">
                <PlanComparison />
              </div>
            </details>

            <details className="group rounded-[22px] bg-white/85 shadow-[0_3px_10px_rgb(168_111_63/0.08)] [&_summary::-webkit-details-marker]:hidden">
              <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 rounded-[22px] px-5 py-3 text-[15px] font-extrabold text-haru-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
                결제 안내 · 자주 묻는 질문
                <ChevronDown aria-hidden className="size-5 shrink-0 transition-transform group-open:rotate-180 motion-reduce:transition-none" />
              </summary>
              <div className="px-5 pb-5">
                <dl className="grid grid-cols-1 gap-4">
                  {FAQS.map((faq) => (
                    <div key={faq.q} className="space-y-1.5">
                      <dt className="text-sm font-semibold text-foreground">{faq.q}</dt>
                      <dd className="text-sm leading-relaxed text-muted-foreground">
                        {faq.a}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            </details>
          </div>
        </div>
      </main>

      <SiteFooter />
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
    a: "카드 결제를 지원해요(토스페이먼츠 결제창 경유). 결제 후 영수증은 결제 완료 화면과 보호자 모드에서 다시 확인하실 수 있어요.",
  },
  {
    q: "환불이 가능한가요?",
    a: "결제일로부터 7일 이내이고 별을 한 번도 쓰지 않으셨다면 결제 승인취소로 결제 금액이 환불돼요. 일부만 쓰셨다면 남은 별의 비율만큼, 7일이 지난 뒤에는 남은 별 가치의 90%가 환불돼요(결제대행 수수료 등 공제). 이미 동화를 만드는 데 쓴 별은 외부 AI 호출 비용이 이미 발생해 환불되지 않아요. 신청은 보호자 이메일로 문의 주시면 안내해 드려요.",
  },
];
