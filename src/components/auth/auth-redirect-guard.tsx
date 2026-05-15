"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useSession } from "next-auth/react";

import { AppSplash, SPLASH_MIN_DURATION_MS } from "@/components/app-splash";

/**
 * 로그인 상태에서 /login, /signup 진입 시 목적지로 돌려보내는 클라이언트 가드.
 *
 * 진실 소스는 Auth.js 세션(`useSession()` → `/api/auth/session`)이다.
 * 과거에는 zustand+localStorage(mock store)를 봤는데, AccountMenu의 로그아웃
 * (`nextAuthSignOut`)이 mock store를 비우지 않아 "로그아웃했는데도 이미
 * 로그인되어 있어요 스플래시가 뜨고 / 로 튕긴다"는 모순이 발생했다.
 * 백엔드 sessions 테이블/쿠키와 일치시키기 위해 useSession으로 일원화.
 *
 *   1) `callbackUrl` 쿼리가 있으면 그 경로(내부 경로만 허용)로 이동
 *   2) 없으면 `/`로 이동(page.tsx가 인증 여부 기반 분기 SSR)
 *
 * Note: `useSearchParams`는 `/login`·`/signup`이 정적 프리렌더 대상(`○`)이므로
 * Suspense 경계가 필요해 빌드가 깨진다. `useEffect` 내부에서만 동작하는 이 가드의
 * 특성상 `window.location.search`로 파싱하는 편이 더 단순하고 안전하다.
 *
 * 시각: signedIn이 true면 곧 라우팅이 일어난다. 이 짧은 사이에 로그인 폼이 그대로
 * 보이면 "왜 또 로그인 화면?" 혼란을 준다. splash로 덮어 의도를 명확히 함.
 */
export function AuthRedirectGuard() {
  const router = useRouter();
  const { status } = useSession();
  const signedIn = status === "authenticated";

  useEffect(() => {
    // status === "loading" 동안에는 가드를 띄우지 않는다(false-positive 방지).
    if (!signedIn) return;

    const raw = new URLSearchParams(window.location.search).get("callbackUrl");
    // open redirect 방지: `/`로 시작하고 `//`·`/\\`가 아닌 내부 경로만 허용
    const isInternal =
      typeof raw === "string" &&
      raw.startsWith("/") &&
      !raw.startsWith("//") &&
      !raw.startsWith("/\\");
    // 2026-04-26: '/app' catch-all 라우트는 nginx 통합으로 사라졌고, page.tsx가
    // 인증 여부에 따라 LandingPage(비로그인) / 책장(로그인)을 SSR하므로 '/'로 충분.
    const target = isInternal ? raw : "/";
    // splash가 한 사이클 인지될 때까지 짧게 지연 후 replace. unmount 시 timer 정리.
    const timer = setTimeout(
      () => router.replace(target),
      SPLASH_MIN_DURATION_MS,
    );
    return () => clearTimeout(timer);
  }, [signedIn, router]);

  return signedIn ? <AppSplash message="이미 로그인되어 있어요" /> : null;
}
