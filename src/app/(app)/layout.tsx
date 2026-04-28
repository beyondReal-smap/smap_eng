import { auth } from '@/auth';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';

/**
 * 인증 사용자 영역 그룹 layout — 책장/단어장/통계/책/퀴즈/보호자가 공유한다.
 *
 * 페이지 이동 시 React tree에서 layout 노드는 보존되므로 `<SiteHeader />`도
 * unmount되지 않는다. 이전엔 각 page.tsx가 자체 SiteHeader를 렌더해 클릭
 * 한 번마다 헤더 전체가 다시 마운트되며 햄버거/AccountMenu가 깜빡이고
 * useSession·use-credit-balance가 매번 refetch되는 회귀가 있었다(2026-04-27 피드백).
 *
 * 비로그인 사용자가 `/`로 들어오면 (app)/page.tsx가 LandingPage를 직접 렌더한다.
 * LandingPage는 자체 헤더(`variant="landing"`)를 들고 있어 이중 헤더가 되므로,
 * server에서 인증 여부를 판단해 SiteHeader는 로그인 사용자에게만 노출한다.
 *
 * cookie 위변조로 분기가 잘못되어도 보안 영향 없음 — 각 페이지의 server data
 * fetching은 `auth()` 결과로 다시 검증된다. 여기서는 헤더 표시 여부만 결정.
 */
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const showHeader = !!session?.user;
  // 비로그인 사용자에게는 (app)/page.tsx가 LandingPage를 직접 렌더하고, LandingPage가
  // 자체 SiteFooter를 들고 있어 푸터가 중복되지 않도록 헤더와 동일 분기로만 노출한다.
  return (
    <>
      {showHeader ? <SiteHeader /> : null}
      {children}
      {showHeader ? <SiteFooter /> : null}
    </>
  );
}
