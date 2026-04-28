import { cn } from "@/lib/utils";

/**
 * 단일 스켈레톤 블록 — `bg-muted` + `animate-pulse`로 미세하게 호흡한다.
 * 라우트 전환 시 본문 영역만 잠깐 비우고 헤더/컨테이너는 유지하기 위한 빌딩 블록.
 *
 * 사용처:
 *   - app 트리 각 라우트의 loading.tsx (App Router Suspense fallback)
 *   - 페이지 내부 데이터 fetch 중 placeholder
 *
 * `role="presentation"` 처리하지 않고 호출처에서 부모 요소에 `aria-busy`/`role="status"`
 * 를 붙이는 것을 권장. 의미 없는 박스가 SR에 읊히지 않도록 `aria-hidden`을 기본 적용.
 */
export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden
      className={cn(
        "animate-pulse rounded-xl bg-muted/70",
        className,
      )}
      {...props}
    />
  );
}
