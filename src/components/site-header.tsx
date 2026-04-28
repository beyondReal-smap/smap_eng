import { AppHeader } from "@/components/app-header";

type Props = {
  /**
   * 서브 페이지에서 헤더 좌측에 백 링크를 노출하고 싶을 때 사용. 미지정 시 백 링크 없음.
   */
  backHref?: string;
  backLabel?: string;
  /**
   * 헤더 중앙에 파비콘(아이콘)만 노출하는 변형. 좌측은 백 링크, 우측은 메뉴 그대로.
   * 결제/구독처럼 브랜드 위계를 약화시키고 단계적 흐름에 집중시키고 싶은 페이지용.
   */
  centered?: boolean;
};

/**
 * 책장·학습 페이지(인증된 사용자)용 헤더 — 단일 `AppHeader`의 `variant="app"` alias.
 *
 * 2026-04-26 통합 후, 마크업/스타일은 `AppHeader`가 단일 진실 공급원이다. 이 wrapper는
 * 기존 import 경로 호환과 의도(`SiteHeader = 앱 헤더`)를 유지하기 위해 남겨둔다.
 */
export function SiteHeader(props: Props = {}) {
  return <AppHeader variant="app" {...props} />;
}
