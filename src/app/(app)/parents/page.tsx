import { TAB_PAGE_SHELL } from '@/components/haru';
import { ParentsHome } from '@/components/parents/parents-home';

export const dynamic = 'force-dynamic';

/**
 * 보호자 모드 — 그림책 세계 톤 + 네이티브 설정 9차 정리(웹 3단계, 2026-09-30).
 * SiteHeader는 (app)/layout.tsx가 보유해 페이지 이동 사이 마운트가 유지된다. 책장 복귀는 헤더 brand·메뉴.
 * PIN은 이 기기에만 저장되며(ParentalPinGate), 로그아웃·계정 삭제 안내는 PIN과 무관하게 항상 보인다.
 */
export default function ParentsPage() {
  return (
    <main className={TAB_PAGE_SHELL}>
      <ParentsHome />
    </main>
  );
}
