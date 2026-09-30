'use client';

import { useState, useSyncExternalStore } from 'react';
import Image from 'next/image';
import { X } from 'lucide-react';
import {
  ANDROID_APP_INTENT_URL,
  APP_STORE_URL,
  PLAY_STORE_URL,
  detectMobilePlatform,
  isInAppWebView,
  type MobilePlatform,
} from '@/lib/billing/store-links';

/**
 * 랜딩 전용 앱 설치 유도 플로팅 CTA (우하단 고정, 스크롤 따라다님).
 *
 * 플랫폼별 동작:
 *  - iOS    → App Store 링크 (설치된 사용자는 스토어의 '열기' 버튼으로 앱 진입)
 *  - Android → intent:// URL (설치 시 앱 열기, 미설치 시 Google Play 폴백)
 *  - 데스크톱 → 클릭 시 QR 카드 팝오버 (스캔하면 /link → 폰 OS별 스토어 자동 이동)
 *
 * 전역 하단 배너(app-store-banner)는 비로그인 '/'에서 스스로 빠져 중복되지 않는다.
 * 인앱 웹뷰에서는 미노출 (앱 안에서 앱 설치 유도 방지).
 */

// SSR 스냅샷은 'other' 고정 → 데스크톱 UI가 기본 렌더, 클라이언트에서 플랫폼 확정.
const emptySubscribe = () => () => {};

function clientPlatform(): MobilePlatform | 'webview' {
  if (isInAppWebView()) return 'webview';
  return detectMobilePlatform();
}

export function AppInstallFab() {
  const platform = useSyncExternalStore(emptySubscribe, clientPlatform, () => 'other' as const);
  const [qrOpen, setQrOpen] = useState(false);

  if (platform === 'webview') return null;
  if (!APP_STORE_URL || !PLAY_STORE_URL) return null;

  const mobileHref = platform === 'ios' ? APP_STORE_URL : ANDROID_APP_INTENT_URL;

  return (
    <div
      className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-3
        pb-[env(safe-area-inset-bottom)]"
    >
      {/* 데스크톱: QR 팝오버 카드 */}
      {platform === 'other' && qrOpen && (
        <div
          role="dialog"
          aria-label="앱 설치 QR 코드"
          className="w-60 rounded-2xl border bg-background p-4 shadow-xl"
        >
          <div className="flex items-start justify-between">
            <p className="text-sm font-semibold leading-snug">
              휴대폰 카메라로
              <br />
              QR을 스캔하세요
            </p>
            <button
              type="button"
              onClick={() => setQrOpen(false)}
              aria-label="QR 카드 닫기"
              className="rounded-md p-1 text-muted-foreground hover:bg-muted"
            >
              <X className="size-4" />
            </button>
          </div>
          <Image
            src="/images/landing/qr-app-install.png"
            alt="하루책 앱 설치 QR 코드"
            width={208}
            height={208}
            className="mt-2 w-full rounded-lg border"
          />
          <div className="mt-3 flex items-center justify-center gap-2 text-xs">
            <a
              href={APP_STORE_URL}
              target="_blank"
              rel="noreferrer"
              className="rounded-full border px-3 py-1.5 font-medium hover:bg-muted"
            >
              App Store
            </a>
            <a
              href={PLAY_STORE_URL}
              target="_blank"
              rel="noreferrer"
              className="rounded-full border px-3 py-1.5 font-medium hover:bg-muted"
            >
              Google Play
            </a>
          </div>
        </div>
      )}

      {platform === 'other' ? (
        <button
          type="button"
          onClick={() => setQrOpen((open) => !open)}
          aria-expanded={qrOpen}
          className="flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm
            font-semibold text-primary-foreground shadow-lg transition-transform
            hover:scale-105"
        >
          <span aria-hidden="true">📱</span> 앱 다운로드
        </button>
      ) : (
        <a
          href={mobileHref}
          className="flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm
            font-semibold text-primary-foreground shadow-lg"
        >
          <span aria-hidden="true">📱</span> 앱에서 보기
        </a>
      )}
    </div>
  );
}
