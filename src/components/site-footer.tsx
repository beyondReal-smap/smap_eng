import Link from 'next/link';
import { BUSINESS_INFO } from '@/lib/legal/business';

/**
 * 전자상거래법 §10이 요구하는 사업자 정보 + 약관 4종 링크를 노출하는 공용 푸터.
 *
 * 랜딩(`landing-scope`) · 앱 그룹(`(app)/`) · 인증 그룹(`(auth)/`) 어디서든 동일하게
 * 마운트되며, 시각 톤만 페이지 컨텍스트에 맞게 자연스럽게 흘러가도록 색은 background/
 * border/muted 토큰만 사용한다(랜딩 페이지의 warm paper 배경과 앱의 light 톤 모두에서
 * 재사용 가능).
 *
 * 정보 갱신은 `src/lib/legal/business.ts` 한 곳에서만 수행한다.
 */
export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-auto border-t border-border/60 bg-background/60 text-sm text-muted-foreground">
      <div className="mx-auto w-[min(1160px,calc(100%-36px))] py-8">
        <nav aria-label="약관 및 정책" className="mb-5 flex flex-wrap items-center gap-x-5 gap-y-2">
          <Link href="/legal/terms" className="hover:text-foreground hover:underline underline-offset-4">
            이용약관
          </Link>
          <span aria-hidden className="select-none text-border">|</span>
          <Link
            href="/legal/privacy"
            className="font-medium text-foreground/90 hover:text-foreground hover:underline underline-offset-4"
          >
            개인정보처리방침
          </Link>
          <span aria-hidden className="select-none text-border">|</span>
          <Link href="/legal/refund" className="hover:text-foreground hover:underline underline-offset-4">
            환불정책
          </Link>
          <span aria-hidden className="select-none text-border">|</span>
          <Link href="/legal/business" className="hover:text-foreground hover:underline underline-offset-4">
            사업자정보
          </Link>
        </nav>

        <address className="not-italic space-y-1 text-xs leading-relaxed sm:text-[13px]">
          <p>
            <span className="font-medium text-foreground/90">{BUSINESS_INFO.companyName}</span>
            <span className="mx-2 text-border">·</span>
            대표 {BUSINESS_INFO.ceoName}
            <span className="mx-2 text-border">·</span>
            사업자등록번호 {BUSINESS_INFO.registrationNumber}
            <span className="mx-2 text-border">·</span>
            통신판매업신고 {BUSINESS_INFO.mailOrderRegistration}
          </p>
          <p>
            {BUSINESS_INFO.address}
          </p>
          <p>
            고객문의{' '}
            <a href={`mailto:${BUSINESS_INFO.email}`} className="hover:text-foreground hover:underline underline-offset-4">
              {BUSINESS_INFO.email}
            </a>
            <span className="mx-2 text-border">·</span>
            <a href={`tel:${BUSINESS_INFO.phone.replace(/-/g, '')}`} className="hover:text-foreground hover:underline underline-offset-4">
              {BUSINESS_INFO.phone}
            </a>
          </p>
        </address>

        <p className="mt-5 text-xs text-muted-foreground/80">
          © {year} {BUSINESS_INFO.companyName} ({BUSINESS_INFO.companyNameEn}). All rights reserved.
        </p>
      </div>
    </footer>
  );
}
