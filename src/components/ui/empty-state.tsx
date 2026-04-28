import * as React from "react"

import { cn } from "@/lib/utils"

type EmptyStateProps = {
  title?: string
  text: string
  illustration?: React.ReactNode
  action?: React.ReactNode
  className?: string
}

/**
 * 공통 EmptyState — 컬렉션이 비었을 때 사용.
 * 일러스트는 호출자가 illustration 슬롯으로 주입(예: BookStackIllustration).
 */
function EmptyState({
  title,
  text,
  illustration,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border-2 border-dashed border-border/80 bg-card/60 p-10 text-center",
        className,
      )}
      role="status"
    >
      {illustration ? <div className="mb-4 flex justify-center">{illustration}</div> : null}
      {title ? (
        <h3 className="font-heading text-xl font-bold">{title}</h3>
      ) : null}
      <p
        className={cn(
          "text-sm text-muted-foreground",
          title ? "mt-2" : "",
        )}
      >
        {text}
      </p>
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  )
}

type ErrorStateProps = {
  title?: string
  text: string
  action?: React.ReactNode
  className?: string
}

/**
 * 공통 ErrorState — 데이터 로딩 실패 등 오류 상황 표시.
 * 색상 톤은 destructive를 약하게 사용해 어린이에게 부담을 주지 않도록 한다.
 */
function ErrorState({ title = "잠깐, 문제가 생겼어요", text, action, className }: ErrorStateProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border-2 border-dashed border-[color:var(--destructive)]/40 bg-[color:var(--destructive)]/5 p-10 text-center",
        className,
      )}
      role="alert"
    >
      <h3 className="font-heading text-xl font-bold text-[color:var(--destructive)]">
        {title}
      </h3>
      <p className="mt-2 text-sm text-muted-foreground">{text}</p>
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  )
}

/**
 * 책장 비었을 때 쓰는 책더미 + 별 일러스트.
 * EmptyState illustration prop으로 주입해서 사용.
 */
function BookStackIllustration() {
  return (
    <svg
      viewBox="0 0 160 120"
      className="h-28 w-auto text-muted-foreground"
      aria-hidden="true"
    >
      <g fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <rect x="28" y="72" width="104" height="22" rx="4" fill="oklch(0.92 0.06 82 / 0.6)" />
        <line x1="40" y1="72" x2="40" y2="94" />
        <rect x="34" y="52" width="88" height="20" rx="4" fill="oklch(0.9 0.06 235 / 0.5)" />
        <line x1="46" y1="52" x2="46" y2="72" />
        <rect x="54" y="30" width="52" height="24" rx="4" fill="oklch(0.9 0.08 18 / 0.55)" />
        <line x1="66" y1="30" x2="66" y2="54" />
        <path d="M124 22 l3 6 6 1 -4.5 4 1 6 -5.5 -3 -5.5 3 1 -6 -4.5 -4 6 -1 z" fill="oklch(0.92 0.12 82 / 0.7)" />
        <path d="M30 16 l2 4 4 0.5 -3 2.5 0.6 4 -3.6 -2 -3.6 2 0.6 -4 -3 -2.5 4 -0.5 z" fill="oklch(0.92 0.1 18 / 0.65)" />
        <circle cx="20" cy="40" r="1.8" fill="currentColor" />
        <circle cx="140" cy="58" r="1.8" fill="currentColor" />
        <circle cx="16" cy="80" r="1.4" fill="currentColor" />
      </g>
    </svg>
  )
}

export { EmptyState, ErrorState, BookStackIllustration }
export type { EmptyStateProps, ErrorStateProps }
