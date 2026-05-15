import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { Card } from '@/components/ui/card';
import { OnboardingForm } from '@/components/auth/onboarding-form';
import { auth } from '@/auth';
import { listProfiles } from '@/lib/db/queries';

export const metadata: Metadata = {
  title: '첫 아이 프로필 · 하루책',
};

// DB 세션 확인이 필요한 페이지 → mysql2 네이티브 모듈 사용하므로 Node 런타임.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * 최초 로그인 직후 자녀 프로필 1명 이상을 만들도록 유도하는 온보딩 페이지.
 * 이미 프로필이 있으면 홈으로 리다이렉트 — 다시 방문해도 무해하도록 멱등 처리.
 */
export default async function OnboardingPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const existing = await listProfiles(session.user.id);
  if (existing.length > 0) redirect('/');

  return (
    <Card className="animate-fade-up rounded-3xl border border-border bg-card/80 p-5 shadow-sm sm:p-8">
      <div className="space-y-1.5 sm:space-y-2">
        <h2 className="font-heading text-xl font-bold tracking-tight sm:text-2xl">
          아이의 첫 프로필을 만들어주세요
        </h2>
        <p className="text-sm text-muted-foreground">
          나이와 닉네임에 맞춰 그 또래 영어 동화를 준비해드려요. 나중에 가족
          프로필을 더 추가할 수 있어요.
        </p>
      </div>

      <div className="mt-5 sm:mt-6">
        <OnboardingForm />
      </div>
    </Card>
  );
}
