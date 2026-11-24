"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { Check, Star } from "lucide-react";

import { Mascot } from "@/components/haru";
import { PackCheckout } from "@/components/subscribe/plan-card";
import { apiFetch } from "@/lib/api-client";
import { STAR_PACKAGES, formatKrw, type StarPackId } from "@/lib/billing/packages";
import type { Profile } from "@/lib/db/schema";
import { useCreditBalance } from "@/lib/hooks/use-credit-balance";
import {
  defaultPackId,
  packBadges,
  packImageBase,
  packPeriodCopy,
} from "@/lib/store-display/pack-display";
import { cn } from "@/lib/utils";
import { useProfileStore } from "@/stores/profile";

/**
 * 별 충전 본문 — 그림책 세계 "별 꾸러미"(네이티브 12차 톤, 2026-09-30).
 * [잔액 카드] → [별 꾸러미 고르기: 단일 선택 라디오 카드] → [하단 결제 버튼 하나].
 *
 * 상품·가격·1개당 가격은 STAR_PACKAGES(src/lib/billing/packages.ts) 그대로이고,
 * 결제는 선택한 꾸러미로 기존 흐름(PackCheckout → checkout API → 토스 결제창)을 그대로 부른다.
 */
export function PricingSection({ notice }: { notice?: React.ReactNode } = {}) {
  const [selectedId, setSelectedId] = useState<StarPackId | null>(() => defaultPackId(STAR_PACKAGES));
  const selected = STAR_PACKAGES.find((p) => p.id === selectedId) ?? null;
  const badges = packBadges(STAR_PACKAGES);

  return (
    <div className="space-y-5">
      <BalanceCard />

      <fieldset className="space-y-3">
        <legend className="mb-3 px-1 text-[15px] font-extrabold text-haru-ink">별 꾸러미 고르기</legend>
        {STAR_PACKAGES.map((pack) => {
          const checked = pack.id === selectedId;
          const period = packPeriodCopy(pack.id);
          const badge = badges[pack.id];
          const base = packImageBase(pack.id);
          return (
            <label
              key={pack.id}
              className={cn(
                "relative flex min-h-[84px] cursor-pointer items-center gap-3 rounded-[22px] border-[2.5px] bg-white px-3.5 py-3 transition-colors has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ring motion-reduce:transition-none",
                badge && "mt-3",
                checked
                  ? "border-haru-coral bg-[#fff7f1] shadow-[0_6px_16px_rgb(245_131_92/0.18)]"
                  : "border-transparent shadow-[0_3px_10px_rgb(168_111_63/0.08)] hover:border-haru-line",
              )}
            >
              <input
                type="radio"
                name="star-pack"
                value={pack.id}
                checked={checked}
                onChange={() => setSelectedId(pack.id)}
                className="sr-only"
                aria-label={[
                  `별 ${pack.stars.toLocaleString("ko-KR")}개`,
                  formatKrw(pack.priceKrw),
                  period,
                  badge === "popular" ? "가장 인기" : badge === "value" ? "가장 알뜰" : null,
                ]
                  .filter(Boolean)
                  .join(", ")}
              />
              {badge ? (
                <span
                  aria-hidden
                  className={cn(
                    "absolute -top-3 left-5 rounded-full px-2.5 py-0.5 text-xs font-extrabold",
                    badge === "popular" ? "bg-haru-coral text-haru-on-coral" : "bg-haru-success-soft text-haru-success-ink",
                  )}
                >
                  {badge === "popular" ? "가장 인기" : "가장 알뜰"}
                </span>
              ) : null}
              <span
                aria-hidden
                className={cn(
                  "flex size-6 shrink-0 items-center justify-center rounded-full border-2",
                  checked ? "border-haru-coral bg-haru-coral text-haru-on-coral" : "border-[#e3cdb8] bg-white",
                )}
              >
                {checked ? <Check className="size-3.5" strokeWidth={4} /> : null}
              </span>
              <picture className="block h-[60px] w-16 shrink-0">
                <source srcSet={`${base}.webp`} type="image/webp" />
                <img src={`${base}.png`} alt="" width={64} height={60} className="size-full object-contain" />
              </picture>
              <span aria-hidden className="min-w-0 flex-1">
                <span className="block text-lg font-extrabold text-haru-ink">
                  별 {pack.stars.toLocaleString("ko-KR")}개
                </span>
                {period ? <span className="block text-[12.5px] font-bold text-haru-muted">{period}</span> : null}
              </span>
              <span aria-hidden className="shrink-0 text-right">
                <span className="block text-[17px] font-extrabold tabular-nums text-haru-ink">{formatKrw(pack.priceKrw)}</span>
                <span className="block text-[11.5px] font-bold tabular-nums text-haru-muted">
                  1개당 {formatKrw(pack.perStarKrw)}
                </span>
              </span>
            </label>
          );
        })}
      </fieldset>

      {/* 결제 화면 사전 고지(청약철회권) — 결제 버튼 바로 위에 항상 보이게. */}
      {notice}

      {selected ? (
        // 모바일에서는 결제 버튼이 화면 아래에 붙어 있게(스크롤해도 보임).
        <div className="sticky bottom-0 z-10 -mx-3 space-y-2 bg-[linear-gradient(to_bottom,transparent,var(--haru-wall)_28%)] px-3 pb-4 pt-6 sm:-mx-6 sm:px-6 lg:static lg:mx-0 lg:bg-none lg:px-0 lg:pt-1">
          <PackCheckout pack={selected} />
        </div>
      ) : null}
    </div>
  );
}

/**
 * 잔액 카드 — 곰 + "{이름}의 별" + ★ N개 + "별 1개로 새 동화 1권을 만들어요".
 * 로딩 중 "—", 조회 실패는 잔액 줄만 "불러오지 못했어요". 로그인 전이면 로그인 안내.
 */
function BalanceCard() {
  const { status } = useSession();
  const authenticated = status === "authenticated";
  const { credits, loading } = useCreditBalance({ enabled: authenticated });
  const profileId = useProfileStore((s) => s.currentProfileId);
  const [profiles, setProfiles] = useState<Profile[]>([]);

  useEffect(() => {
    if (!authenticated) return;
    const controller = new AbortController();
    apiFetch<{ profiles: Profile[] }>("/api/profiles", { signal: controller.signal })
      .then((res) => setProfiles(res.profiles))
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        // 이름만 빠질 뿐("지금 가진 별") 충전은 그대로 — 원인은 로그로.
        console.warn("[subscribe] profiles load failed:", err);
      });
    return () => controller.abort();
  }, [authenticated]);

  const name = (profiles.find((p) => p.id === profileId) ?? profiles[0])?.name ?? null;
  const balanceText =
    status === "unauthenticated"
      ? null
      : credits
        ? `${credits.balance.toLocaleString("ko-KR")}개`
        : loading || status === "loading"
          ? "—"
          : null;

  return (
    <section
      aria-label="지금 가진 별"
      className="relative flex items-center gap-3 overflow-hidden rounded-[24px] bg-[linear-gradient(135deg,#fff6e8,#ffe3cf)] px-4 py-4 shadow-[0_8px_20px_rgb(168_111_63/0.14)]"
    >
      <span aria-hidden className="absolute -right-6 -top-8 size-28 rounded-full bg-[#ffe7a6]/70" />
      <Mascot pose="normal" size={96} className="relative -my-2 max-sm:size-[80px]" />
      <div className="relative min-w-0">
        <p className="text-[13px] font-extrabold text-haru-muted">{name ? `${name}의 별` : "지금 가진 별"}</p>
        {status === "unauthenticated" ? (
          <p className="mt-0.5 text-base font-extrabold text-haru-ink">로그인하면 별 잔액이 보여요</p>
        ) : balanceText ? (
          <p className="mt-0.5 flex items-center gap-1.5 text-[34px] font-extrabold leading-none tabular-nums text-haru-ink">
            <Star aria-hidden className="size-7 fill-haru-star text-haru-star" />
            {balanceText}
          </p>
        ) : (
          <p className="mt-0.5 text-base font-extrabold text-haru-ink">불러오지 못했어요</p>
        )}
        <p className="mt-1.5 text-[13px] font-bold text-haru-ink/80">별 1개로 새 동화 1권을 만들어요</p>
      </div>
    </section>
  );
}
