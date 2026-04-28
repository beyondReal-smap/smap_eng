'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { signIn } from 'next-auth/react';
import { toast } from 'sonner';

import { AppSplash, SPLASH_MIN_DURATION_MS } from '@/components/app-splash';
import { cn } from '@/lib/utils';

/**
 * 구글/카카오 OAuth 로그인 버튼 — Auth.js v5 연동.
 *
 * 브랜드 가이드 준수:
 *   - 카카오: #FEE500 배경 + 검정 텍스트 + 공식 말풍선 심볼
 *   - 구글:   흰 배경 + #1F1F1F 텍스트 + 공식 4색 로고
 *
 * 시각 톤: 랜딩의 pill(둥근 버튼) + sticker-shadow(2D offset) 감성에 맞춤.
 *
 * callbackUrl 결정:
 *   1) 현재 URL에 `?callbackUrl=...` 있으면 그 값(내부 경로만 허용)
 *   2) 없으면 login → /app, signup → /onboarding 으로 fallback
 * `window.location.search`로 읽는 이유: `/login`이 정적 프리렌더 대상(`○`)이라
 * `useSearchParams`를 쓰면 Suspense 경계가 필요해 빌드가 깨진다. 클라이언트 핸들러
 * 시점에만 필요한 값이라 window API로 충분.
 */
export function SocialLoginButtons({
  mode = 'login',
}: {
  mode?: 'login' | 'signup';
}) {
  const verb = mode === 'login' ? '로그인' : '시작';
  const [loading, setLoading] = useState<'google' | 'kakao' | null>(null);

  function resolveCallbackUrl(): string {
    // login fallback: '/' → page.tsx가 인증 여부 기반으로 책장을 분기 SSR.
    // 과거 '/app'은 5027 catch-all 잔재로, nginx 통합(2026-04-26) 후 404였다.
    const fallback = mode === 'signup' ? '/onboarding' : '/';
    if (typeof window === 'undefined') return fallback;
    const raw = new URLSearchParams(window.location.search).get('callbackUrl');
    const isInternal =
      typeof raw === 'string' &&
      raw.startsWith('/') &&
      !raw.startsWith('//') &&
      !raw.startsWith('/\\');
    return isInternal ? raw : fallback;
  }

  async function handle(provider: 'google' | 'kakao', label: string) {
    setLoading(provider);
    // signIn은 호출 즉시 location.assign으로 외부 도메인으로 이동시키므로,
    // splash가 깜박이지 않고 한 사이클 보이도록 호출 자체를 지연한다.
    await new Promise((resolve) =>
      setTimeout(resolve, SPLASH_MIN_DURATION_MS),
    );
    try {
      await signIn(provider, { callbackUrl: resolveCallbackUrl() });
    } catch (err) {
      setLoading(null);
      toast.error(`${label} ${verb} 실패`, {
        description: err instanceof Error ? err.message : '잠시 후 다시 시도해주세요.',
      });
    }
  }

  // OAuth 리다이렉트 직전 splash. signIn은 await 후 location.assign으로 이동하므로
  // 사용자에겐 거의 즉시 외부 도메인이지만, 카카오/구글 응답이 느릴 때 버튼이 그대로 보이면
  // 한 번 더 누르고 싶어진다. 클릭 즉시 splash로 의도를 시각화.
  const splashLabel =
    loading === 'kakao'
      ? '카카오로 이동 중…'
      : loading === 'google'
        ? '구글로 이동 중…'
        : null;

  return (
    <>
      {splashLabel ? <AppSplash message={splashLabel} /> : null}
      <div className="flex flex-col gap-2.5">
        <button
          type="button"
          onClick={() => handle('kakao', '카카오')}
          disabled={loading !== null}
          className={cn(
            'group relative flex h-12 w-full items-center justify-center gap-3 rounded-full',
            'bg-[#FEE500] px-5 font-semibold text-[#191919] sticker-shadow',
            'transition-all hover:-translate-y-[1px] hover:bg-[#FFDC00] active:translate-y-0',
            'focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[#FEE500]/60',
            'disabled:cursor-not-allowed disabled:opacity-60',
          )}
          aria-label={`카카오로 ${verb}`}
        >
          {loading === 'kakao' ? (
            <Loader2 aria-hidden className="size-5 animate-spin" />
          ) : (
            <KakaoIcon className="size-5" aria-hidden />
          )}
          <span>
            {loading === 'kakao' ? '카카오 열리는 중…' : `카카오로 ${verb}하기`}
          </span>
        </button>

        <button
          type="button"
          onClick={() => handle('google', '구글')}
          disabled={loading !== null}
          className={cn(
            'group relative flex h-12 w-full items-center justify-center gap-3 rounded-full',
            'border-2 border-border bg-background px-5 font-semibold text-foreground sticker-shadow',
            'transition-all hover:-translate-y-[1px] hover:bg-muted active:translate-y-0',
            'focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
            'disabled:cursor-not-allowed disabled:opacity-60',
          )}
          aria-label={`구글로 ${verb}`}
        >
          {loading === 'google' ? (
            <Loader2 aria-hidden className="size-5 animate-spin" />
          ) : (
            <GoogleIcon className="size-5" aria-hidden />
          )}
          <span>
            {loading === 'google' ? '구글 열리는 중…' : `Google로 ${verb}하기`}
          </span>
        </button>
      </div>
    </>
  );
}

/** 카카오 심볼 (공식 말풍선). */
function KakaoIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M12 3C6.477 3 2 6.582 2 11c0 2.86 1.87 5.37 4.705 6.833-.207.765-.75 2.78-.86 3.212-.135.532.196.525.412.382.17-.113 2.708-1.84 3.803-2.585.627.093 1.272.158 1.94.158 5.523 0 10-3.582 10-8S17.523 3 12 3z" />
    </svg>
  );
}

/** Google 4색 로고 (공식 asset, 단색 버전 금지). */
function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 48 48"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
      <path fill="none" d="M0 0h48v48H0z" />
    </svg>
  );
}
