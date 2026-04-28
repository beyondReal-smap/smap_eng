"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { AppSplash, SPLASH_MIN_DURATION_MS } from "@/components/app-splash";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginAction } from "@/lib/auth/actions";
import type { LoginFormState } from "@/lib/auth/schemas";
import { APP_HOME } from "@/lib/paths";
import { useSessionStore } from "@/stores/session";
import { cn } from "@/lib/utils";

/**
 * 이메일 로그인 폼.
 * Next.js 16 Server Actions + useActionState 패턴.
 * 서버 검증 실패 시 필드 하단에 에러 메시지, 성공 시 홈으로 라우팅.
 */
export function EmailLoginForm() {
  const router = useRouter();
  const setUser = useSessionStore((s) => s.setUser);
  const [state, formAction, pending] = useActionState<LoginFormState, FormData>(
    loginAction,
    undefined,
  );
  const [showPassword, setShowPassword] = useState(false);
  const redirecting = Boolean(state && "ok" in state && state.ok);

  useEffect(() => {
    if (!(state && "ok" in state && state.ok)) return;
    setUser({ email: state.email, provider: "email" });
    toast.success("로그인되었습니다");
    // 2026-04-26 nginx 통합 이후 `/`는 page.tsx가 인증 여부 기반으로 LandingPage /
    // 책장을 분기 SSR하므로 APP_HOME='/'로 충분. callbackUrl 쿼리가 있으면 우선.
    // open redirect 방지: `/`로 시작하고 `//`·`/\\`가 아닌 내부 경로만 허용.
    const raw = new URLSearchParams(window.location.search).get("callbackUrl");
    const isInternal =
      typeof raw === "string" &&
      raw.startsWith("/") &&
      !raw.startsWith("//") &&
      !raw.startsWith("/\\");
    const target = isInternal ? raw : APP_HOME;
    // 서버 액션이 빠르게 끝나도 splash가 한 프레임만 깜박이고 사라지지 않도록
    // 최소 1주기 노출 후 라우팅. unmount 시 timer 정리.
    const timer = setTimeout(() => router.push(target), SPLASH_MIN_DURATION_MS);
    return () => clearTimeout(timer);
  }, [state, router, setUser]);

  if (redirecting) {
    return <AppSplash message="책장 여는 중…" />;
  }

  const errors = state && "errors" in state ? state.errors : undefined;
  const message = state && "message" in state ? state.message : undefined;

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      {message ? (
        <p className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
          {message}
        </p>
      ) : null}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email">이메일</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          placeholder="parent@example.com"
          aria-invalid={Boolean(errors?.email)}
          aria-describedby={errors?.email ? "email-error" : undefined}
          className="h-11 text-base"
          required
        />
        {errors?.email?.[0] && (
          <p id="email-error" className="text-xs text-destructive">
            {errors.email[0]}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex items-baseline justify-between">
          <Label htmlFor="password">비밀번호</Label>
          {/* TODO(auth-backend): /forgot-password 라우트 구현 후 연결. 현재는 toast 안내 stub. */}
          <button
            type="button"
            onClick={() =>
              toast.info("비밀번호 재설정 기능은 곧 열립니다", {
                description:
                  "당분간은 고객지원(support@harubook.kr)으로 문의해 주세요.",
              })
            }
            className="text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            비밀번호를 잊으셨나요?
          </button>
        </div>
        <div className="relative">
          <Input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            placeholder="••••••••"
            aria-invalid={Boolean(errors?.password)}
            aria-describedby={errors?.password ? "password-error" : undefined}
            className="h-11 pr-10 text-base"
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? "비밀번호 숨기기" : "비밀번호 표시"}
            className={cn(
              "absolute right-1.5 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-md",
              "text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            )}
          >
            {showPassword ? (
              <EyeOff className="size-4" />
            ) : (
              <Eye className="size-4" />
            )}
          </button>
        </div>
        {errors?.password?.[0] && (
          <p id="password-error" className="text-xs text-destructive">
            {errors.password[0]}
          </p>
        )}
      </div>

      <Button
        type="submit"
        variant="complete"
        size="lg"
        disabled={pending}
        className="h-12 w-full text-base"
      >
        {pending ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            로그인 중…
          </>
        ) : (
          "이메일로 로그인"
        )}
      </Button>
    </form>
  );
}
