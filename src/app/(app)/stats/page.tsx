import { auth } from '@/auth';
import { TAB_PAGE_SHELL } from '@/components/haru';
import { StatsDashboard } from '@/components/stats-dashboard';
import { listProfiles } from '@/lib/db/queries';

export const dynamic = 'force-dynamic';

/**
 * 통계 — "{이름}의 독서 기록"(그림책 세계, 2026-09-30).
 * SiteHeader는 (app)/layout.tsx가 보유해 페이지 이동 사이 마운트가 유지된다. 책장 복귀는 헤더 brand·메뉴.
 * 제목에 아이 이름을 첫 paint부터 쓰려고 프로필 목록만 서버에서 읽고, 기록은 클라이언트가 기존 API로 받는다.
 */
export default async function StatsPage() {
  const session = await auth();
  const profiles = session?.user ? await listProfiles(session.user.id) : [];
  return (
    <main className={TAB_PAGE_SHELL}>
      <StatsDashboard initialProfiles={profiles} />
    </main>
  );
}
