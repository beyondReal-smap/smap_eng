"use client";

import { useState } from "react";
import { Check, ChevronDown, Minus } from "lucide-react";

import { PACKAGE_COMPARISON, STAR_PACKAGES } from "@/lib/billing/packages";
import { cn } from "@/lib/utils";

/**
 * 별 충전 패키지 비교.
 * - 데스크톱(sm+): 4컬럼 가로 테이블 — 나란히 보기.
 * - 모바일(<sm): 패키지별 Accordion(details/summary) — 세로 스크롤 대신 선택 펼치기로
 *   좁은 화면에서도 각 패키지의 모든 기능을 잘림 없이 확인 가능.
 *
 * "가로 스크롤 min-w-[640px]" 방식은 모바일에서 힌트가 없어 안 보인다고 인식됨
 *   → 모바일은 구조 전환으로 해결.
 */
export function PlanComparison() {
  return (
    <section
      aria-labelledby="compare-title"
      className="rounded-3xl border border-border bg-card/80 p-5 shadow-sm sm:p-7"
    >
      <header className="mb-5 space-y-1">
        <h2
          id="compare-title"
          className="font-heading text-xl font-bold tracking-tight"
        >
          패키지별 자세히 비교하기
        </h2>
        <p className="text-sm text-muted-foreground">
          어떤 패키지가 우리 가족에게 맞을지 한 눈에 확인해 보세요.
        </p>
      </header>

      {/* 데스크톱 테이블 */}
      <div className="hidden sm:block">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-border">
              <th
                scope="col"
                className="w-[38%] py-3 pl-4 pr-2 text-left font-medium text-muted-foreground"
              >
                기능
              </th>
              {STAR_PACKAGES.map((pack) => (
                <th
                  key={pack.id}
                  scope="col"
                  className={cn(
                    "py-3 px-2 text-center font-heading text-sm font-semibold",
                    pack.highlighted && "text-primary",
                  )}
                >
                  {pack.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PACKAGE_COMPARISON.map((row, i) => (
              <tr
                key={row.label}
                className={cn(
                  "border-b border-border/60 last:border-b-0",
                  i % 2 === 0 && "bg-muted/25",
                )}
              >
                <th
                  scope="row"
                  className="py-3 pl-4 pr-2 text-left font-medium text-foreground"
                >
                  {row.label}
                </th>
                {STAR_PACKAGES.map((pack) => {
                  const value = row.values[pack.id];
                  return (
                    <td
                      key={pack.id}
                      className={cn(
                        "py-3 px-2 text-center",
                        pack.highlighted && "bg-primary/5",
                      )}
                    >
                      <CompareCell value={value} />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 모바일 Accordion */}
      <div className="space-y-3 sm:hidden">
        {STAR_PACKAGES.map((pack) => (
          <MobilePlanGroup key={pack.id} packId={pack.id} />
        ))}
      </div>
    </section>
  );
}

function MobilePlanGroup({
  packId,
}: {
  packId: (typeof STAR_PACKAGES)[number]["id"];
}) {
  const pack = STAR_PACKAGES.find((p) => p.id === packId);
  if (!pack) return null;
  const [open, setOpen] = useState(!!pack.highlighted);

  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border transition-colors",
        pack.highlighted
          ? "border-primary/50 bg-primary/5"
          : "border-border bg-card",
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/40"
      >
        <span
          className={cn(
            "font-heading text-sm font-bold tracking-tight",
            pack.highlighted && "text-primary",
          )}
        >
          {pack.name}
        </span>
        <ChevronDown
          aria-hidden
          className={cn(
            "size-4 text-muted-foreground transition-transform",
            open && "rotate-180",
          )}
        />
      </button>

      {open && (
        <dl className="divide-y divide-border/60 border-t border-border/60">
          {PACKAGE_COMPARISON.map((row) => (
            <div
              key={row.label}
              className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm"
            >
              <dt className="font-medium text-foreground">{row.label}</dt>
              <dd className="shrink-0">
                <CompareCell value={row.values[packId]} />
              </dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}

function CompareCell({ value }: { value: boolean | string }) {
  if (value === true) {
    return (
      <span className="inline-flex size-6 items-center justify-center rounded-full bg-primary/15 text-primary">
        <Check className="size-3.5" strokeWidth={3} />
        <span className="sr-only">포함</span>
      </span>
    );
  }
  if (value === false) {
    return (
      <span className="inline-flex size-6 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Minus className="size-3.5" strokeWidth={2.5} />
        <span className="sr-only">미포함</span>
      </span>
    );
  }
  return (
    <span className="text-sm font-medium text-foreground">{value}</span>
  );
}
