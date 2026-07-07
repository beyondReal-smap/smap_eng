/**
 * 앱 설치(스토어) 링크 + 모바일 OS 감지.
 *
 * 웹은 디지털 콘텐츠(별)를 직접 결제하지 않고 — App Store 3.1.1 / Google Play 정책 —
 * 충전 CTA를 누르면 사용자의 OS에 맞는 앱 스토어 설치 페이지로 보낸다.
 *  - iOS  → App Store
 *  - Android → Google Play
 *  - 그 외(데스크톱 등) → 두 스토어 버튼을 함께 보여주는 선택 모달
 *
 * URL은 빌드 타임에 inline되는 NEXT_PUBLIC_* 환경변수. 변경 후 `pnpm build` 재실행 필요.
 * 미설정(빈 문자열) 시 호출부에서 '준비 중' 처리(네비게이션 차단).
 */

// NEXT_PUBLIC_* 은 리터럴 접근해야 클라이언트 번들에 inline된다(동적 process.env[name] 금지).
export const APP_STORE_URL = process.env.NEXT_PUBLIC_APP_STORE_URL ?? '';
export const PLAY_STORE_URL = process.env.NEXT_PUBLIC_PLAY_STORE_URL ?? '';

export type MobilePlatform = 'ios' | 'android' | 'other';

/** navigator.userAgent 기반 모바일 OS 감지. SSR(navigator 없음)에서는 'other'. */
export function detectMobilePlatform(): MobilePlatform {
  if (typeof navigator === 'undefined') return 'other';
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua)) return 'ios';
  // iPadOS 13+ 는 데스크톱 Safari로 위장(Macintosh)하므로 터치 지원 여부로 보정.
  if (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1) return 'ios';
  if (/Android/.test(ua)) return 'android';
  return 'other';
}

/** 플랫폼별 스토어 URL. 미설정 시 빈 문자열. */
export function storeUrlFor(platform: 'ios' | 'android'): string {
  return platform === 'ios' ? APP_STORE_URL : PLAY_STORE_URL;
}

/**
 * 인앱 웹뷰(iOS WKWebView / Android WebView) 여부.
 *
 * App Store 3.1.1 정책상 앱 내 웹뷰에서 외부 카드결제창을 띄우면 리젝 사유이므로,
 * 웹뷰로 판별되면 부트페이 결제창 대신 스토어 유도로 폴백한다.
 *  - iOS: 모바일 Safari 는 UA 에 'Safari/' 를 포함, 인앱 WKWebView 는 미포함.
 *  - Android: 앱 WebView 는 UA 에 'wv' 토큰이 붙는다.
 *
 * (하루책 앱은 별 충전을 네이티브 IAP 로 처리해 이 페이지를 웹뷰로 열지 않지만,
 *  향후·우회 진입에 대비한 방어 코드.) SSR(navigator 없음)에서는 false.
 */
export function isInAppWebView(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  const platform = detectMobilePlatform();
  if (platform === 'ios') return !/Safari\//.test(ua);
  if (platform === 'android') return /\bwv\b/.test(ua);
  return false;
}
