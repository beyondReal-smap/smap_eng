import { PlanCard } from "@/components/subscribe/plan-card";
import { STAR_PACKAGES } from "@/lib/billing/packages";

/**
 * 별 충전 패키지 3종을 한 화면에 고정 노출.
 *
 * 카드 순서: 별 1개(맛보기) → 별 60개 팩(추천/하이라이트) → 별 130개 팩(최대 혜택).
 * STAR_PACKAGES 배열이 이미 이 순서로 선언되어 있음(src/lib/billing/packages.ts).
 */
export function PricingSection() {
  return (
    <section
      aria-label="별 충전 패키지"
      className="grid grid-cols-1 gap-5 md:grid-cols-3"
    >
      {STAR_PACKAGES.map((pack) => (
        <PlanCard key={pack.id} pack={pack} />
      ))}
    </section>
  );
}
