import { AppHeader } from '@/components/app-header';
import { SiteFooter } from '@/components/site-footer';

/**
 * 공개 콘텐츠 페이지(/about, /faq, /pricing, /samples) 공용 레이아웃.
 *
 * 이 그룹의 페이지는 **비로그인 방문자와 AI 크롤러가 주 독자**다. 따라서
 *  - 인증 상태에 따라 내용이 달라지지 않는다(전부 정적 렌더 대상).
 *  - 헤더는 랜딩과 동일한 `AppHeader variant="landing"`을 쓴다. 크롤러가 어떤
 *    경로로 진입해도 브랜드·내비게이션이 랜딩과 같아 사이트 구조가 일관되게 읽힌다.
 *  - 푸터는 SiteFooter — 사업자정보·약관 링크가 모든 공개 페이지에 노출되어야
 *    전자상거래법 §10 요건과 크롤러의 신뢰도 판단(E-E-A-T)을 동시에 만족한다.
 *
 * `(public)`은 route group이라 URL에 나타나지 않는다. `/about` 등 경로 그대로 유지.
 * 프록시 공개 경로 목록(`src/proxy.ts`)에도 반드시 등록되어 있어야 한다.
 */
export default function PublicContentLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <AppHeader variant="landing" />
      <main className="mx-auto w-[min(880px,calc(100%-36px))] flex-1 py-10 sm:py-14">
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
