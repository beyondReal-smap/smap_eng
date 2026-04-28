import { cookies } from 'next/headers';

import { AppHeader } from '@/components/app-header';

/**
 * 루트(/) 진입 fallback.
 *
 * 깜빡임 방지가 핵심. NextAuth 세션 cookie 존재로 사용자를 빠르게 분기:
 *   - 로그인 추정: 책장용 fallback(`AppHeader variant="app-fallback"`).
 *     우측을 비워둬 placeholder 노이즈를 없애고, brand 위치만 RSC와 동일하게 잡는다.
 *   - 비로그인: 랜딩 fallback(`AppHeader variant="landing"`). LandingPage RSC와
 *     완전히 같은 헤더 컴포넌트라 swap 시 layout shift 0.
 *
 * 이력:
 *   1차: <SiteHeader/> + 책장 skeleton — 비로그인이 SiteHeader 안의 client fetch
 *        (/api/profiles 401)를 발동시켜 1초 후 /login으로 자동 redirect되는 무한 튕김.
 *   2차: 인증 비의존 sticky bar skeleton — fallback skeleton 헤더가 /login·/ 의
 *        랜딩 헤더와 마크업이 달라 헤더가 잠깐 깜빡임.
 *   3차: null — fallback이 빈 화면이라 헤더가 ~300ms 동안 사라짐.
 *   4차: /login·/ 와 동일한 .landing-scope 랜딩 헤더만 그린 단일 fallback.
 *        → 책장 사용자가 /book/[id]에서 /로 돌아갈 때 "앱 시작하기" CTA가 잠깐 보였다
 *          책장으로 swap되는 위화감(2026-04-26 피드백).
 *   5차: 세션 cookie 분기 + AppShellHeader/LandingShellHeader 인라인 마크업.
 *        → 헤더 마크업이 5곳에 분산(SiteHeader, AuthHeader, LandingPage, fallback 2개)
 *          되며 매번 미세 차이가 발생 — 통합 부족 피드백.
 *   6차(현재): 모든 페이지 헤더를 단일 `AppHeader`로 통합. fallback도 같은 컴포넌트의
 *        variant alias만 호출 — 마크업 차이가 발생할 여지 자체를 제거.
 *
 * ⚠️ client fetch가 발생하는 컴포넌트(MobileMenu, ProfileSwitcher 등)는 fallback 단계에서
 *    mount되지 않아야 한다. variant="app-fallback"은 우측을 null로 두어 안전.
 *
 * cookie 위변조로 fallback이 잘못 추정되어도 보안 영향 없음 — RSC 도착 시 서버의 auth()
 * 결과로 실제 콘텐츠가 결정된다. fallback은 단지 "어떤 헤더 모양을 한 프레임 보여줄지"
 * 의 시각 분기일 뿐.
 */
export default async function GlobalLoading() {
  const cookieStore = await cookies();
  const hasSession =
    cookieStore.has('__Secure-authjs.session-token') ||
    cookieStore.has('authjs.session-token');

  return hasSession ? (
    <AppHeader variant="app-fallback" />
  ) : (
    <AppHeader variant="landing" />
  );
}
