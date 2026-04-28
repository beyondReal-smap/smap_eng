import type { Metadata } from "next";
import Link from "next/link";

import { AuthDivider } from "@/components/auth/auth-divider";
import { EmailLoginForm } from "@/components/auth/email-login-form";
import { SocialLoginButtons } from "@/components/auth/social-login-buttons";
import { Card } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "로그인 · 하루책",
  description: "하루책에 로그인해서 아이의 책장을 이어가세요.",
};

export default function LoginPage() {
  return (
    <Card className="animate-fade-up p-6 sticker-shadow-lg sm:p-8">
      <div className="space-y-2">
        <h2 className="font-heading text-3xl font-extrabold tracking-tight">
          다시 만나서 반가워요
        </h2>
        <p className="text-sm text-muted-foreground">
          아이의 책장을 이어서 열어드릴게요.
        </p>
      </div>

      <div className="mt-6 flex flex-col gap-5">
        <SocialLoginButtons mode="login" />
        <AuthDivider>또는 이메일로 계속하기</AuthDivider>
        <EmailLoginForm />
      </div>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        아직 계정이 없으신가요?{" "}
        <Link
          href="/signup"
          className="font-medium text-foreground underline-offset-4 hover:underline"
        >
          회원가입
        </Link>
      </p>
    </Card>
  );
}
