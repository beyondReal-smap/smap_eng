"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { AppSplash, SPLASH_MIN_DURATION_MS } from "@/components/app-splash";
import { useIsSignedIn } from "@/stores/session";

/**
 * 로그인 상태에서 /login, /signup 진입 시 목적지로 돌려보내는 클라이언트 가드.
 *
 * 이전 버전은 무조건 `/`(= 랜딩 홈)로 replace했는데, 이 경우 CTA가 가리키는
 * `/login?callbackUrl=%2Fapp` 에서 튕겨져 다시 랜딩으로 돌아가 "CTA를 눌러도
 * 반응이 없는" 루프가 발생했다. 이제는:
 *   1) `callbackUrl` 쿼리가 있으면 그 경로(내부 경로만 허용)로 이동
 *   2) 없으면 기본 앱 홈 `/app`으로 이동
 *
 * Note: `useSearchParams`는 `/login`·`/signup`이 정적 프리렌더 대상(`○`)이므로
 * Suspense 경계가 필요해 빌드가 깨진다. `useEffect` 내부에서만 동작하는 이 가드의
 * 특성상 `window.location.search`로 파싱하는 편이 더 단순하고 안전하다.
 *
 * 시각: signedIn이 true면 곧 라우팅이 일어난다. 이 짧은 사이에 로그인 폼이 그대로
 * 보이면 "왜 또 로그인 화면?" 혼란을 준다. splash로 덮어 의도를 명확히 함.
 *
 * ⚠️ 현재는 mock session (localStorage) 기반이므로 서버 SSR 가드는 불가능하다.
 * 백엔드 전환 시 middleware + cookies()로 서버 레벨 가드로 이동.
 */
export function AuthRedirectGuard() {
  const router = useRouter();
  const signedIn = useIsSignedIn();

  useEffect(() => {
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
