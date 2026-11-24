import { auth } from '@/auth';
import { Bookshelf } from '@/components/bookshelf';
import { TAB_PAGE_SHELL } from '@/components/haru';
import { LandingPage } from '@/components/landing/landing-page';
import { getCreditBalance } from '@/lib/billing/credits';
import {
  type BookProgressStat,
  type LearningSummary as LearningSummaryData,
  getBookProgressMap,
  getLearningSummary,
  listBooks,
  listProfiles,
} from '@/lib/db/queries';
import type { Book } from '@/lib/db/schema';

// 매 요청마다 사용자 데이터를 동적으로 페치.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * 루트(/) — 동일 URL에서 인증 여부에 따라 랜딩(LP) 또는 책장을 server-render한다.
 *
 * - 비로그인 → <LandingPage/> (자체 landing 헤더). (app)/layout.tsx의 SiteHeader는
 *   비로그인일 때 server에서 null 처리되므로 헤더가 중복되지 않는다.
 * - 로그인  → 그림책 세계 책장(Bookshelf — 제목·칩·곰 인사·나무 책장, 2026-09-30).
 *   기존 학습 요약 카드(LearningSummary)·별 충전 배너(UpgradeBanner)는 네이티브 책장처럼
 *   ★ 칩(→ 별 충전)·곰 인사(이어 읽기)·🔥 칩(이번 주 기록)으로 대체했다.
 *   SiteHeader는 상위 (app)/layout.tsx가 보유해 페이지 이동 사이에도 마운트가 유지된다.
 *
 * 2026-05-14 — 새로고침 시 layout shift가 잡혀 "움찔거린다"는 피드백을 받고
 * 책장·학습요약·잔액 배너의 초기 데이터를 server에서 일괄 페치해 props로 주입.
 * 클라이언트는 첫 paint부터 정상 내용을 가지므로 useEffect fetch 직후 setBooks /
 * setSummary가 호출되며 텍스트·카드 수가 바뀌는 점프가 사라진다. 활성 프로필은
 * 첫 프로필을 기본으로 사용 — zustand persist가 다른 값을 가지면 클라이언트가
 * effect에서 갱신한다.
 */
export default async function Home() {
  const session = await auth();
  if (!session?.user) {
    return <LandingPage />;
  }
  const userId = session.user.id;

  // 잔액·프로필은 책 데이터와 무관하므로 병렬로 가져온다.
  const [profiles, credits] = await Promise.all([
    listProfiles(userId),
    getCreditBalance(userId),
  ]);
  const activeProfile = profiles[0] ?? null;
  const profileId = activeProfile?.id ?? null;

  // 활성 프로필이 있을 때만 그에 의존하는 페치(책장·진도·요약)를 병렬로.
  // ts가 튜플 element 타입을 좁히지 못해 `: []`이 'never[]'로 추론되므로
  // 명시적으로 튜플 타입을 단언해 BookProgressStat 인덱싱이 유효해지도록 한다.
  const [initialBooks, initialStats, initialSummary] = (profileId
    ? await Promise.all([
        listBooks({ profileId }),
        getBookProgressMap(profileId),
        getLearningSummary(profileId),
      ])
    : [[], {}, null]) as [
    Book[],
    Record<number, BookProgressStat>,
    LearningSummaryData | null,
  ];

  return (
    // 데스크톱에서는 상단 헤더와 같은 폭(최대 1160px) — 좁은 책장이 헤더보다 안쪽에 있어
    // 왼쪽으로 치우쳐 보이던 문제(웹 1단계 캡처)를 헤더 가장자리에 맞춰 해결.
    <main className={TAB_PAGE_SHELL}>
      <Bookshelf
        initialProfileId={profileId}
        initialProfiles={profiles}
        initialBooks={initialBooks}
        initialStats={initialStats}
        initialSummary={initialSummary}
        initialCredits={credits}
      />
    </main>
  );
}
