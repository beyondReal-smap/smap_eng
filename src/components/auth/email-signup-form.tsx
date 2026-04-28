"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { AppSplash, SPLASH_MIN_DURATION_MS } from "@/components/app-splash";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signupAction } from "@/lib/auth/actions";
import type { SignupFormState } from "@/lib/auth/schemas";
import { useSessionStore } from "@/stores/session";
import { cn } from "@/lib/utils";

/**
 * 이메일 회원가입 폼 — /signup 전용.
 * 아이 이름(또는 별명)을 최상단에 배치 (첫 프로필의 기본 표시명으로 사용 예정).
 */
export function EmailSignupForm() {
  const router = useRouter();
  const setUser = useSessionStore((s) => s.setUser);
  const [state, formAction, pending] = useActionState<
    SignupFormState,
    FormData
  >(signupAction, undefined);
  const [showPassword, setShowPassword] = useState(false);
  const redirecting = Boolean(state && "ok" in state && state.ok);

  // 약관/개인정보/연령 동의는 한국 개인정보보호법 §22 (분리 동의 의무) +
  // 정통망법 §31 (만 14세 미만 법정대리인 동의) 충족을 위해 3개 체크박스로 분리.
  // base-ui Checkbox는 hidden input을 렌더하므로 controlled state라도 FormData에
  // name=on 으로 정상 제출된다. "전체 동의"는 UX용이며 name이 없어 제출되지 않음.
  const [agreeAge, setAgreeAge] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreePrivacy, setAgreePrivacy] = useState(false);
  const allAgreed = agreeAge && agreeTerms && agreePrivacy;
  const setAllAgreed = (v: boolean) => {
    setAgreeAge(v);
    setAgreeTerms(v);
    setAgreePrivacy(v);
  };

  useEffect(() => {
    if (!(state && "ok" in state && state.ok)) return;
    setUser({
      email: state.email,
      childName: state.childName,
      provider: "email",
    });
    toast.success("가입이 완료됐어요! 플랜을 골라볼까요?");
    // splash 최소 노출 후 /subscribe로. unmount 시 timer 정리.
    const timer = setTimeout(
      () => router.push("/subscribe"),
      SPLASH_MIN_DURATION_MS,
    );
    return () => clearTimeout(timer);
  }, [state, router, setUser]);

  if (redirecting) {
    return <AppSplash message="다음 단계로…" />;
  }

  const errors = state && "errors" in state ? state.errors : undefined;

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="childName">
          아이 이름
          <span className="text-xs font-normal text-muted-foreground">
            (별명도 괜찮아요)
          </span>
        </Label>
        <Input
          id="childName"
          name="childName"
          type="text"
          autoComplete="given-name"
          placeholder="예: 하준"
          maxLength={20}
          aria-invalid={Boolean(errors?.childName)}
          aria-describedby={errors?.childName ? "child-error" : undefined}
          className="h-11 text-base"
          required
        />
        {errors?.childName?.[0] && (
          <p id="child-error" className="text-xs text-destructive">
            {errors.childName[0]}
          </p>
        )}
      </div>

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
        <Label htmlFor="password">비밀번호</Label>
        <div className="relative">
          <Input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            placeholder="영문 + 숫자 포함 8자 이상"
            aria-invalid={Boolean(errors?.password)}
            aria-describedby={
              errors?.password ? "password-error" : "password-hint"
            }
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
        {errors?.password?.[0] ? (
          <p id="password-error" className="text-xs text-destructive">
            {errors.password[0]}
          </p>
        ) : (
          <p id="password-hint" className="text-xs text-muted-foreground">
            영문과 숫자를 포함해 8자 이상으로 만들어 주세요.
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2.5 rounded-lg border border-border/60 bg-muted/30 p-3 pt-2.5">
        <label
          htmlFor="agreeAll"
          className="flex items-center gap-2.5 text-sm font-medium text-foreground cursor-pointer"
        >
          <Checkbox
            id="agreeAll"
            checked={allAgreed}
            onCheckedChange={(v) => setAllAgreed(v === true)}
            className="size-[18px]"
          />
          <span>전체 동의</span>
        </label>

        <div className="ml-[2px] flex flex-col gap-2 border-t border-border/60 pt-2.5">
          <label
            htmlFor="agreeAge"
            className="flex items-start gap-2.5 text-xs leading-relaxed text-muted-foreground cursor-pointer"
          >
            <Checkbox
              id="agreeAge"
              name="agreeAge"
              checked={agreeAge}
              onCheckedChange={(v) => setAgreeAge(v === true)}
              aria-invalid={Boolean(errors?.agreeAge)}
              aria-describedby={errors?.agreeAge ? "age-error" : undefined}
              className="mt-0.5"
            />
            <span>
              <span className="font-medium text-foreground">[필수]</span>{" "}
              만 14세 이상 보호자임을 확인합니다.
            </span>
          </label>
          {errors?.agreeAge?.[0] && (
            <p id="age-error" className="text-xs text-destructive">
              {errors.agreeAge[0]}
            </p>
          )}

          <label
            htmlFor="agreeTerms"
            className="flex items-start gap-2.5 text-xs leading-relaxed text-muted-foreground cursor-pointer"
          >
            <Checkbox
              id="agreeTerms"
              name="agreeTerms"
              checked={agreeTerms}
              onCheckedChange={(v) => setAgreeTerms(v === true)}
              aria-invalid={Boolean(errors?.agreeTerms)}
              aria-describedby={
                errors?.agreeTerms ? "terms-error" : undefined
              }
              className="mt-0.5"
            />
            <span>
              <span className="font-medium text-foreground">[필수]</span>{" "}
              <Link
                href="/legal/terms"
                target="_blank"
                rel="noreferrer"
                className="underline underline-offset-2 hover:text-foreground"
              >
                이용약관
              </Link>
              에 동의합니다.
            </span>
          </label>
          {errors?.agreeTerms?.[0] && (
            <p id="terms-error" className="text-xs text-destructive">
              {errors.agreeTerms[0]}
            </p>
          )}

          <label
            htmlFor="agreePrivacy"
            className="flex items-start gap-2.5 text-xs leading-relaxed text-muted-foreground cursor-pointer"
          >
            <Checkbox
              id="agreePrivacy"
              name="agreePrivacy"
              checked={agreePrivacy}
              onCheckedChange={(v) => setAgreePrivacy(v === true)}
              aria-invalid={Boolean(errors?.agreePrivacy)}
              aria-describedby={
                errors?.agreePrivacy ? "privacy-error" : undefined
              }
              className="mt-0.5"
            />
            <span>
              <span className="font-medium text-foreground">[필수]</span>{" "}
              <Link
                href="/legal/privacy"
                target="_blank"
                rel="noreferrer"
                className="underline underline-offset-2 hover:text-foreground"
              >
                개인정보 수집·이용
              </Link>
              에 동의합니다 (이메일·계정 ID).
            </span>
          </label>
          {errors?.agreePrivacy?.[0] && (
            <p id="privacy-error" className="text-xs text-destructive">
              {errors.agreePrivacy[0]}
            </p>
          )}
        </div>
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
            가입 중…
          </>
        ) : (
          "이메일로 시작하기"
        )}
      </Button>
    </form>
  );
}
