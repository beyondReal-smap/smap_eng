'use client';

import Link from 'next/link';
import { FileText, Mail, Star } from 'lucide-react';
import { signOut as nextAuthSignOut, useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { TabHeader } from '@/components/haru';
import { ParentalPinGate } from '@/components/parental-pin';
import { WeeklyReport } from '@/components/weekly-report';
import { formatStars } from '@/lib/billing/terminology';
import { useCreditBalance } from '@/lib/hooks/use-credit-balance';
import { BUSINESS_INFO } from '@/lib/legal/business';
import { SettingsGroup, SettingsLinkRow } from './settings-rows';

/**
 * 보호자 모드(/parents) — 그림책 세계 톤 + 네이티브 설정 9차의 정리 원칙
 * (프로필 카드 → 그룹 카드 + 행 부제). 구성:
 *   [PIN 잠금 안] 계정 카드(별 잔액) · 아이들의 이번 주(주간 리포트) · 보호자 도구
 *   [항상 보임]   도움과 정보 · 로그아웃 · 계정 삭제 안내
 * 로그아웃·계정 삭제 경로는 PIN과 무관하게 늘 보이게 둔다(스토어 규정·보호자 편의).
 * PIN 규칙(이 기기에만 저장, 30분 자동 잠금)은 기존 ParentalPinGate 그대로.
 */
export function ParentsHome() {
  return (
    <div className="mx-auto max-w-[720px] space-y-6">
      <TabHeader title="보호자 모드" />
      <ParentalPinGate>
        <div className="space-y-6">
          <AccountCard />
          <SettingsGroup title="아이들의 이번 주">
            <div className="p-3 sm:p-4">
              <WeeklyReport />
            </div>
          </SettingsGroup>
          <SettingsGroup title="보호자 도구">
            <SettingsLinkRow
              href="/subscribe"
              icon={<Star className="size-[18px] fill-current" />}
              tone="gold"
              title="별 충전"
              subtitle="별 1개로 새 동화 1권을 만들어요"
            />
          </SettingsGroup>
        </div>
      </ParentalPinGate>

      <SettingsGroup title="도움과 정보">
        <SettingsLinkRow
          href={`mailto:${BUSINESS_INFO.email}`}
          external
          icon={<Mail className="size-[18px]" />}
          tone="sky"
          title="고객 문의"
          subtitle={BUSINESS_INFO.email}
        />
        <SettingsLinkRow
          href="/legal/terms"
          icon={<FileText className="size-[18px]" />}
          tone="stone"
          title="약관 및 정책"
          subtitle="이용약관 · 개인정보 · 환불 · 사업자정보"
        />
      </SettingsGroup>

      <AccountFooter />
    </div>
  );
}

/** 계정 카드 — 크림→살구 그라데이션(설정 프로필 카드와 같은 톤) + 별 잔액 버튼. */
function AccountCard() {
  const { data: session } = useSession();
  const { credits, loading } = useCreditBalance();
  const user = session?.user;
  const email = user?.email ?? '';
  const name = user?.name ?? (email ? email.split('@')[0] : '보호자');
  const initial = (email || name).slice(0, 1).toUpperCase();
  const balanceText = loading ? '—' : credits === null ? '불러오지 못했어요' : formatStars(credits.balance);

  return (
    <section
      aria-label="보호자 계정"
      className="relative overflow-hidden rounded-[24px] bg-[linear-gradient(135deg,#fff6ea,#ffe4d4)] p-4 shadow-[0_8px_20px_rgb(168_111_63/0.12)] sm:p-5"
    >
      <span aria-hidden className="pointer-events-none absolute -right-10 -top-12 size-40 rounded-full bg-[#ffe8a8]/70" />
      <div className="relative flex items-center gap-3.5">
        <span
          aria-hidden
          className="flex size-16 shrink-0 items-center justify-center rounded-full bg-haru-coral-soft text-2xl font-extrabold text-haru-coral-ink ring-4 ring-white"
        >
          {initial}
        </span>
        <div className="min-w-0">
          <p className="truncate text-[22px] font-extrabold leading-tight text-haru-ink">{name}</p>
          {email ? <p className="mt-0.5 truncate text-[13px] font-bold text-haru-muted">{email}</p> : null}
        </div>
      </div>
      <Link
        href="/subscribe"
        aria-label={`별 잔액 ${balanceText}, 별 충전하러 가기`}
        className="relative mt-4 flex min-h-12 items-center justify-center gap-1.5 rounded-full bg-white text-[15px] font-extrabold text-haru-ink shadow-[0_3px_8px_rgb(168_111_63/0.1)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        <Star aria-hidden className="size-4 fill-[#e08a1e] text-[#e08a1e]" />
        {balanceText}
        <span className="text-haru-coral-ink">충전 ›</span>
      </Link>
    </section>
  );
}

/** 맨 아래 — 로그아웃(테두리 알약) + 캡션 + 계정 삭제 안내 링크. PIN과 무관하게 항상 보인다. */
function AccountFooter() {
  const { status } = useSession();

  function handleSignOut() {
    // 헤더 계정 메뉴와 같은 동작.
    toast.success('로그아웃되었어요');
    void nextAuthSignOut({ callbackUrl: '/login' });
  }

  return (
    <div className="flex flex-col items-center gap-2 pb-4 pt-2 text-center">
      {status === 'authenticated' ? (
        <button
          type="button"
          onClick={handleSignOut}
          className="inline-flex min-h-12 items-center rounded-full border-[2.5px] border-[#ebc9b6] bg-white/80 px-7 text-[15px] font-extrabold text-haru-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          로그아웃
        </button>
      ) : null}
      <p className="text-xs font-bold text-haru-muted">
        {BUSINESS_INFO.serviceName} · {BUSINESS_INFO.companyName}
      </p>
      {/* 웹에는 앱 안 계정 삭제 화면이 없어 삭제 방법 안내(외부 요청 경로 포함)로 연결한다. */}
      <Link
        href="/legal/data-deletion"
        className="inline-flex min-h-11 items-center px-2 text-[13px] font-bold text-haru-coral-ink underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-ring"
      >
        계정 삭제 안내
      </Link>
    </div>
  );
}
