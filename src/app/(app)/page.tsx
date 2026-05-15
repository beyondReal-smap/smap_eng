import { auth } from '@/auth';
import { Bookshelf } from '@/components/bookshelf';
import { LandingPage } from '@/components/landing/landing-page';
import { LearningSummary } from '@/components/learning-summary';
import { UpgradeBanner } from '@/components/subscribe/upgrade-banner';
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
 * - 로그인  → 기존 책장(Bookshelf + LearningSummary + UpgradeBanner). SiteHeader는
 *   상위 (app)/layout.tsx가 보유해 페이지 이동 사이에도 마운트가 유지된다.
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

  // 이어 읽기 책: summary.continueBookId가 있으면 books에서 찾아 채워둔다.
  // 단건 API(/api/books/[id])를 안 거치고도 prop으로 바로 표시 가능.
  const continueBookId = initialSummary?.continueBookId ?? null;
  const initialContinueBook = continueBookId
    ? (initialBooks.find((b) => b.id === continueBookId) ?? null)
    : null;
  const initialContinueStat =
    continueBookId !== null ? (initialStats[continueBookId] ?? null) : null;

  return (
    <main className="mx-auto w-full max-w-6xl space-y-6 px-4 pb-24 pt-6 sm:px-6">
      {/* 별 보유 여부와 무관하게 추가 충전 CTA를 항상 노출한다. */}
      <UpgradeBanner initialCredits={credits} />

      <LearningSummary
        initialProfileId={profileId}
        initialProfileName={activeProfile?.name ?? null}
        initialSummary={initialSummary}
        initialContinueBook={initialContinueBook}
        initialContinueStat={initialContinueStat}
      />

      <div id="bookshelf">
        <Bookshelf
          initialProfileId={profileId}
          initialBooks={initialBooks}
          initialStats={initialStats}
        />
      </div>
    </main>
  );
}
