import type { Metadata } from 'next';
import Image from 'next/image';
import { APP_STORE_URL, PLAY_STORE_URL } from '@/lib/billing/store-links';

/**
 * 유니버설 링크/앱 링크 폴백 페이지 (/link).
 *
 * eng.smap.site/link* 는 앱 설치 시 브라우저를 거치지 않고 바로 앱으로 열린다
 * (iOS: AASA applinks, Android: assetlinks + 인텐트 필터). 모바일 미설치
 * 사용자는 proxy.ts가 OS별 스토어로 307 리다이렉트하므로, 이 페이지가 실제
 * 렌더되는 경우는 데스크톱·스토어 URL 미설정·비정상 UA 정도다. 그 경우
 * 두 스토어 링크를 함께 보여준다.
 *
 * 딥링크 네임스페이스를 /link 로 한 이유: 전체 도메인을 클레임하면 웹 OAuth
 * 콜백·결제 리다이렉트까지 앱이 가로채는 사고가 나고, /app 은 메인 앱 경로
 * 스코핑 구상(pwa-register.tsx 참조)과 겹칠 수 있다.
 */

export const metadata: Metadata = {
  title: '앱에서 열기',
  robots: { index: false, follow: false },
};

export default function AppLinkFallbackPage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 px-6 text-center">
      <Image
        src="/book_icon.png"
        alt="하루책"
        width={72}
        height={72}
        className="rounded-2xl"
      />
      <div>
        <h1 className="text-xl font-bold">하루책 앱에서 열 수 있어요</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          휴대폰에서 아래 스토어를 열어 하루책 앱을 설치해 주세요.
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3">
        {APP_STORE_URL && (
          <a
            href={APP_STORE_URL}
            className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground"
          >
            App Store
          </a>
        )}
        {PLAY_STORE_URL && (
          <a
            href={PLAY_STORE_URL}
            className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground"
          >
            Google Play
          </a>
        )}
      </div>
      <a href="/" className="text-sm text-muted-foreground underline underline-offset-4">
        웹에서 계속 보기
      </a>
    </main>
  );
}
