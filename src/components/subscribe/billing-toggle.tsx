"use client";

import { cn } from "@/lib/utils";

/**
 * 월간 ↔ 연간 토글.
 * 연간 선택 시 할인 배지 자동 표시.
 * 1회성 플랜은 별도 카드로 유지되므로 이 토글에 포함되지 않음.
 */
export function BillingToggle({
  value,
  onChange,
  discountPercent,
}: {
  value: "monthly" | "yearly";
  onChange: (v: "monthly" | "yearly") => void;
  discountPercent: number;
}) {
  return (
    <div
      role="group"
      aria-label="결제 주기 선택"
      className="relative inline-flex items-center gap-1 rounded-full border border-border bg-muted p-1 shadow-sm"
    >
      {(["monthly", "yearly"] as const).map((option) => {
        const isActive = value === option;
        const label = option === "monthly" ? "월간 결제" : "연간 결제";
        return (
          <button
            key={option}
            type="button"
            aria-pressed={isActive}
            onClick={() => onChange(option)}
            className={cn(
              "relative inline-flex h-9 items-center gap-2 rounded-full px-4 text-sm font-medium transition-all",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              isActive
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {label}
            {option === "yearly" && (
              <span
                className={cn(
                  "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "bg-primary/15 text-primary",
                )}
              >
                {discountPercent}% 할인
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
