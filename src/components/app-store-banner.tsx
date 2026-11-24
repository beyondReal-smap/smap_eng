'use client';

import { useState, useSyncExternalStore } from 'react';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { X } from 'lucide-react';
import { useSession } from 'next-auth/react';
import {
  ANDROID_APP_INTENT_URL,
  PLAY_STORE_URL,
  detectMobilePlatform,
  isInAppWebView,
} from '@/lib/billing/store-links';

/**
 * Android 전용 하단 앱 유도 배너.
 *
 * iOS는 layout.tsx metadata.itunes(apple-itunes-app)로 Safari 네이티브 스마트
 * 배너가 뜨지만 Android에는 대응물이 없어 커스텀 배너로 채운다.
 *
 * 노출 조건:
 *  - Android 브라우저 (인앱 웹뷰 제외 — 앱 안에서 앱 설치 유도 방지)
 *  - /admin(관리 화면)·/subscribe(결제 흐름) 제외
 *  - 닫은 뒤 DISMISS_TTL_MS 동안 재노출 안 함
 *
 * '앱 열기'는 intent:// URL — 설치 시 앱의 https://eng.smap.site/link
 * 인텐트 필터(AndroidManifest)로 열리고, 미설치·구버전 앱이면
 * browser_fallback_url(Google Play)로 폴백된다.
 */

/** 배너 닫은 시각(ms) 저장 키. */
const DISMISS_KEY = 'app-store-banner-dismissed-at';
/** 닫은 뒤 재노출까지 대기 기간(14일). */
const DISMISS_TTL_MS = 14 * 24 * 60 * 60 * 1000;

// SSR(서버 스냅샷)에서는 false → hydration mismatch 없이 클라이언트에서만 노출 판정.
// 입력(UA·localStorage)이 페이지 수명 동안 불변이므로 구독은 no-op.
const emptySubscribe = () => () => {};

function isEligibleClient(): boolean {
  // 스토어 URL 미설정(빈 문자열) 시 폴백이 없으므로 노출하지 않는다.
  if (!PLAY_STORE_URL) return false;
  if (detectMobilePlatform() !== 'android' || isInAppWebView()) return false;
  const dismissedAt = Number(localStorage.getItem(DISMISS_KEY) ?? 0);
  return Date.now() - dismissedAt >= DISMISS_TTL_MS;
}

export function AppStoreBanner() {
  const pathname = usePathname();
  const { status } = useSession();
  const eligible = useSyncExternalStore(emptySubscribe, isEligibleClient, () => false);
  const [dismissed, setDismissed] = useState(false);

  if (!eligible || dismissed) return null;
  if (pathname.startsWith('/admin') || pathname.startsWith('/subscribe')) {
    return null;
  }
  // 비로그인 '/'는 랜딩 — 랜딩 전용 <AppInstallFab/>가 CTA를 담당하므로 중복 노출 방지.
  // (세션은 layout에서 SSR 주입되어 status가 즉시 확정 — 깜빡임 없음)
  if (pathname === '/' && status !== 'authenticated') {
    return null;
  }

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setDismissed(true);
  };

  return (
    <div
      role="complementary"
      aria-label="하루책 앱 안내"
      className="fixed inset-x-0 bottom-0 z-50 border-t bg-background/95 backdrop-blur
        pb-[env(safe-area-inset-bottom)] shadow-[0_-2px_8px_rgba(0,0,0,0.06)]"
    >
      <div className="mx-auto flex max-w-screen-sm items-center gap-3 px-4 py-2.5">
        <Image
          src="/book_icon.png"
          alt=""
          width={36}
          height={36}
          className="rounded-lg"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">하루책 앱으로 보기</p>
          <p className="truncate text-xs text-muted-foreground">
            낭독·퀴즈·단어 복습을 더 편하게
          </p>
        </div>
        <a
          href={ANDROID_APP_INTENT_URL}
          className="shrink-0 rounded-full bg-primary px-4 py-1.5 text-sm font-semibold
            text-primary-foreground"
        >
          앱 열기
        </a>
        <button
          type="button"
          onClick={dismiss}
          aria-label="배너 닫기"
          className="shrink-0 rounded-md p-1 text-muted-foreground"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}
