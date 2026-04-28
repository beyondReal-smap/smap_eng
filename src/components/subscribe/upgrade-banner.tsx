"use client";

import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { useSession } from "next-auth/react";

import { formatKrw, getPackage } from "@/lib/billing/packages";
import { useCreditBalance } from "@/lib/hooks/use-credit-balance";
import { formatStars } from "@/lib/billing/terminology";

const LOW_CREDIT_THRESHOLD = 3;

/**
 * 홈 상단 별 충전 안내 배너.
 *
 * 별(⭐) 크레딧 정책:
 *  - 1회 충전형, 만료 없음, 가족 합산. 자동결제/해지 개념 없음.
 *  - 별 1개 = 동화 1권. 추천 팩(별 50개)을 기준으로 가격을 노출.
 *
 * 노출 규칙:
 *  - 비로그인/로그인 모두 항상 노출. 별은 1회 충전형이므로 보유 중이어도 추가 구매 가능.
 *  - 로그인 + 잔액 1~3개: 재충전 독려 카피로 강화.
 *  - 로그인 + 잔액 0개: 즉시 충전 카피로 강화.
 */
export function UpgradeBanner() {
  const { status } = useSession();
  const { credits } = useCreditBalance({
    enabled: status === "authenticated",
  });

  const recommended = getPackage("medium");
  const balance =
    status === "authenticated" && credits !== null ? credits.balance : null;
  const isEmpty = balance !== null && balance <= 0;
  const isLow =
    balance !== null && balance > 0 && balance <= LOW_CREDIT_THRESHOLD;
  const title = isEmpty
    ? "별이 모두 사용되었어요. 새 동화를 만들려면 충전이 필요해요."
    : isLow
      ? `${formatStars(balance)} 남았어요. 읽기 흐름이 끊기기 전에 채워둘까요?`
      : balance !== null
        ? `${formatStars(balance)} 보유 중이에요. 필요할 때 더 충전할 수 있어요.`
        : "별을 충전하고 새 동화를 만들어볼까요?";
  const description = isLow
    ? `별 ${recommended.stars}개 팩이면 권당 ${formatKrw(recommended.perStarKrw)} · 만료 없음 · 가족 합산`
    : `별 ${recommended.stars}개 ${formatKrw(recommended.priceKrw)} · 권당 ${formatKrw(recommended.perStarKrw)} · 만료 없음 · 가족 합산`;

  return (
    <Link
      href="/subscribe"
      className={`group flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-sm shadow-sm transition-all ${
        isLow || isEmpty
          ? "border-[color:var(--destructive)]/35 bg-[color:var(--destructive)]/10 hover:border-[color:var(--destructive)]/50 hover:bg-[color:var(--destructive)]/15"
          : "border-primary/30 bg-primary/10 hover:border-primary/50 hover:bg-primary/15"
      }`}
      aria-label="별 충전 페이지 보러 가기"
    >
      <div className="flex items-center gap-2.5">
        <span
          aria-hidden
          className={`inline-flex size-8 shrink-0 items-center justify-center rounded-xl text-primary-foreground shadow-sm ${
            isLow || isEmpty ? "bg-[color:var(--destructive)]" : "bg-primary"
          }`}
        >
          <Sparkles className="size-4" strokeWidth={2.5} />
        </span>
        <div className="min-w-0">
          <p className="font-semibold text-foreground">
            {title}
          </p>
          <p className="text-xs text-muted-foreground">
            {description}
          </p>
        </div>
      </div>
      <span
        className={`hidden items-center gap-1 text-xs font-semibold sm:inline-flex ${
          isLow || isEmpty ? "text-[color:var(--destructive)]" : "text-primary"
        }`}
      >
        충전하기
        <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
      </span>
    </Link>
  );
}
