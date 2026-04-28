import { Skeleton } from "@/components/ui/skeleton";

/**
 * 인증(/login, /signup, /onboarding) 진입 fallback.
 *
 * AuthLayout(좌: BrandPanel, 우: children 카드)을 이어받으므로 여기서는 우측 폼 카드 자리만
 * 채운다. 풀스크린 splash로 layout 전체를 덮어버리면 BrandPanel이 사라졌다 다시 나타나는
 * 깜박임이 생긴다는 피드백(2026-04-26)에 따라 layout 보존형으로 변경.
 */
export default function AuthLoading() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="인증 화면 여는 중"
      className="rounded-3xl border border-border bg-card/85 p-6 shadow-sm sm:p-8"
    >
      {/* 제목/부제 */}
      <Skeleton className="h-8 w-40 rounded-full" />
      <Skeleton className="mt-3 h-4 w-64 max-w-full rounded-full" />

      {/* 입력 필드 2개 + CTA */}
      <div className="mt-6 space-y-4">
        <div className="space-y-2">
          <Skeleton className="h-3 w-16 rounded-full" />
          <Skeleton className="h-11 w-full rounded-2xl" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-3 w-20 rounded-full" />
          <Skeleton className="h-11 w-full rounded-2xl" />
        </div>
        <Skeleton className="mt-2 h-12 w-full rounded-full" />
      </div>

      {/* 디바이더 */}
      <div className="my-6 flex items-center gap-3">
        <Skeleton className="h-px flex-1 rounded-full" />
        <Skeleton className="h-3 w-8 rounded-full" />
        <Skeleton className="h-px flex-1 rounded-full" />
      </div>

      {/* 소셜 로그인 버튼 */}
      <div className="space-y-3">
        <Skeleton className="h-11 w-full rounded-full" />
        <Skeleton className="h-11 w-full rounded-full" />
      </div>
    </div>
  );
}
