import type { Metadata } from "next";
import Link from "next/link";

import { AuthDivider } from "@/components/auth/auth-divider";
import { EmailSignupForm } from "@/components/auth/email-signup-form";
import { SocialLoginButtons } from "@/components/auth/social-login-buttons";
import { Card } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "회원가입 · 하루책",
  description:
    "하루책에서 아이의 첫 번째 영어 동화를 시작해보세요. 30초면 가입 완료.",
};

export default function SignupPage() {
  return (
    <Card className="animate-fade-up p-6 sticker-shadow-lg sm:p-8">
      <div className="space-y-2">
        <h2 className="font-heading text-3xl font-extrabold tracking-tight">
          하루책에 가입하기
        </h2>
        <p className="text-sm text-muted-foreground">
          아이에게 딱 맞는 첫 동화를 30초 만에 시작해요.
        </p>
      </div>

      <div className="mt-6 flex flex-col gap-5">
        <SocialLoginButtons mode="signup" />
        <AuthDivider>또는 이메일로 시작하기</AuthDivider>
        <EmailSignupForm />
      </div>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        이미 계정이 있으신가요?{" "}
        <Link
          href="/login"
          className="font-medium text-foreground underline-offset-4 hover:underline"
        >
          로그인
        </Link>
      </p>
    </Card>
  );
}
