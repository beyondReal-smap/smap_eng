'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RotateCcw, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { apiFetch } from '@/lib/api-client';
import type {
  BookProgressStat,
  LearningSummary,
} from '@/lib/db/queries';
import type { Book, CefrLevel, Profile } from '@/lib/db/schema';
import {
  seedCredits,
  useCreditBalance,
  type CreditBalance,
} from '@/lib/hooks/use-credit-balance';
import { latestCreatedLevel, recentReadLevel } from '@/lib/create-book/guide';
import { weeklyStreak } from '@/lib/weekly-streak';
import { useProfileStore } from '@/stores/profile';
import { CreateBookDialog } from './create-book-dialog';
import {
  Bookcase,
  LevelTabs,
  MAGIC_BOOK_CLASS,
  MagicBookFace,
  ShelfBook,
  ShelfRows,
  ShelfSkeleton,
  ShelfSlot,
} from './bookshelf/components';
import type { GreetingSituation } from './bookshelf/greeting';
import { GreetingRow, ShelfHeader } from './bookshelf/header';
import { isFinished } from './bookshelf/shared';

// 외부(app/(app)/loading.tsx 등)가 '@/components/bookshelf'에서 import하던 공개 컴포넌트 재노출.
export { LevelBadge, ShelfSkeleton } from './bookshelf/components';

/**
 * 책장(홈) — 그림책 세계(웹 1단계, 네이티브 iOS BookshelfView와 같은 구성).
 * [제목 + 🔥·★·아바타 칩] → [곰 + 인사 말풍선] → [나무 책장(레벨 탭·검색·책·마법 책)].
 *
 * SSR 단계의 (app)/page.tsx가 활성 프로필 기준으로 책·진도·요약·잔액·프로필 목록을 미리 페치해
 * prop으로 준다. 클라이언트는 zustand의 currentProfileId가 서버가 본 프로필과 다를 때만 재페치해
 * 첫 paint부터 layout shift 없이 그려진다.
 */
export function Bookshelf({
  initialProfileId = null,
  initialProfiles = [],
  initialBooks = [],
  initialStats = {},
  initialSummary = null,
  initialCredits = null,
}: {
  initialProfileId?: number | null;
  initialProfiles?: Profile[];
  initialBooks?: Book[];
  initialStats?: Record<number, BookProgressStat>;
  initialSummary?: LearningSummary | null;
  initialCredits?: CreditBalance | null;
} = {}) {
  const hasHydrated = useProfileStore((s) => s.hasHydrated);
  const profileId = useProfileStore((s) => s.currentProfileId);
  const [cefrFilter, setCefrFilter] = useState<CefrLevel | ''>('');
  const [query, setQuery] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const searchRef = useRef<HTMLInputElement>(null);
  // 처음 방문해 저장된 프로필이 없으면 ProfileSwitcher가 첫 프로필을 고를 때까지 서버가 본 프로필을 쓴다
  // ("누가 읽을 거예요?"가 잠깐 비쳤다 사라지는 깜빡임 방지 — 서버도 첫 프로필을 활성으로 본다).
  const activeProfileId = hasHydrated ? (profileId ?? initialProfileId) : initialProfileId;
  const requestKey = JSON.stringify([
    activeProfileId,
    cefrFilter,
    debouncedQ,
    refreshKey,
  ]);
  const [result, setResult] = useState<{
    key: string;
    profileId: number | null;
    books: Book[];
    stats: Record<number, BookProgressStat>;
    error: boolean;
  }>({
    key: JSON.stringify([initialProfileId, '', '', 0]),
    profileId: initialProfileId,
    books: initialBooks,
    stats: initialStats,
    error: false,
  });
  const hasFilters = Boolean(query.trim() || cefrFilter);
  const isCurrent = activeProfileId !== null && result.key === requestKey;
  const loading =
    query.trim() !== debouncedQ ||
    (!hasHydrated && initialProfileId === null) ||
    (activeProfileId !== null && result.key !== requestKey);
  const hasError = isCurrent && result.error;
  const books = result.books;
  const stats = result.stats;

  // ---------- 프로필(제목·인사 호칭) ----------
  const [profiles, setProfiles] = useState<Profile[]>(initialProfiles);
  const currentProfile = profiles.find((p) => p.id === activeProfileId) ?? null;
  // 새로 만든 프로필 등 SSR 목록에 없는 프로필로 바뀌면 목록을 다시 받는다.
  useEffect(() => {
    if (activeProfileId === null || currentProfile) return;
    const controller = new AbortController();
    apiFetch<{ profiles: Profile[] }>('/api/profiles', { signal: controller.signal })
      .then((res) => setProfiles(res.profiles))
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        // 제목이 "책장"으로 남을 뿐 책장 동작은 계속된다 — 원인은 로그로.
        console.warn('[bookshelf] profiles load failed:', err);
      });
    return () => controller.abort();
  }, [activeProfileId, currentProfile]);

  // ---------- 별 잔액(★ 칩) ----------
  // 헤더 AccountMenu / MobileMenu와 같은 모듈 캐시를 공유하도록 SSR 잔액을 시드한다(서버에선 no-op).
  useEffect(() => {
    if (initialCredits) seedCredits(initialCredits);
  }, [initialCredits]);
  const { credits, loading: creditsLoading } = useCreditBalance({ initial: initialCredits });

  // ---------- 학습 요약(이어 읽기·연속 학습) ----------
  const [summaryState, setSummaryState] = useState<{
    profileId: number | null;
    summary: LearningSummary | null;
  }>({ profileId: initialProfileId, summary: initialSummary });

  useEffect(() => {
    if (activeProfileId === null) return;
    if (refreshKey === 0 && activeProfileId === summaryState.profileId && summaryState.summary) return;
    const controller = new AbortController();
    apiFetch<{ summary: LearningSummary }>(
      `/api/learning-summary?profileId=${activeProfileId}`,
      { signal: controller.signal },
    )
      .then((res) => setSummaryState({ profileId: activeProfileId, summary: res.summary }))
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        // 이어 읽기 말풍선·🔥 칩은 보조 정보 — 실패하면 두 곳만 숨기고 책장은 그대로 둔다.
        console.warn('[bookshelf] learning summary load failed:', err);
        setSummaryState({ profileId: activeProfileId, summary: null });
      });
    return () => controller.abort();
    // summaryState는 비교용으로만 읽는다 — 넣으면 응답마다 다시 요청한다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeProfileId, refreshKey]);

  const summary = summaryState.profileId === activeProfileId ? summaryState.summary : null;

  // 검색어 debounce (200ms) — 입력 중 과다 fetch 방지.
  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedQ(query.trim()), 200);
    return () => window.clearTimeout(t);
  }, [query]);

  /**
   * 브라우저 탭 복귀 / BFCache 복귀 / 창 포커스 시 책장 자동 갱신.
   * Reader에서 진도를 PATCH한 뒤 책장으로 돌아왔을 때 최신 stats가 즉시 보이도록.
   */
  useEffect(() => {
    function bump() {
      setRefreshKey((k) => k + 1);
    }
    function onVisible() {
      if (document.visibilityState === 'visible') bump();
    }
    function onPageShow(event: PageTransitionEvent) {
      if (event.persisted) bump();
    }
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', bump);
    window.addEventListener('pageshow', onPageShow);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', bump);
      window.removeEventListener('pageshow', onPageShow);
    };
  }, []);

  useEffect(() => {
    if (!hasHydrated || activeProfileId === null || result.key === requestKey) return;
    const controller = new AbortController();
    const params = new URLSearchParams({ profileId: activeProfileId.toString() });
    if (cefrFilter) params.set('cefr', cefrFilter);
    if (debouncedQ) params.set('q', debouncedQ);
    apiFetch<{
      books: Book[];
      stats: Record<number, BookProgressStat>;
    }>(`/api/books?${params}`, { signal: controller.signal })
      .then((res) => {
        if (controller.signal.aborted) return;
        setResult({
          key: requestKey,
          profileId: activeProfileId,
          books: res.books,
          stats: res.stats ?? {},
          error: false,
        });
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        console.warn('[bookshelf] books load failed:', err);
        setResult({ key: requestKey, profileId: activeProfileId, books: [], stats: {}, error: true });
      });
    // 검색이나 프로필을 바꾸면 이전 응답이 새 목록을 덮어쓰지 않도록 취소한다.
    return () => controller.abort();
  }, [
    hasHydrated,
    activeProfileId,
    cefrFilter,
    debouncedQ,
    requestKey,
    result.key,
  ]);

  // 최신순 고정.
  const sortedBooks = useMemo(() => {
    return [...books].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }, [books]);

  // 이어 읽을 책 — 요약의 진행 중 책. 다 읽은 책이면 권하지 않는다(iOS와 같은 규칙).
  // 레벨 필터로 목록에서 빠져도 인사가 바뀌지 않도록 마지막으로 찾은 책을 기억한다.
  const continueId = summary?.continueBookId ?? null;
  const [lastContinueBook, setLastContinueBook] = useState<Book | null>(
    () => initialBooks.find((b) => b.id === initialSummary?.continueBookId) ?? null,
  );
  const foundContinue = continueId !== null ? books.find((b) => b.id === continueId) : undefined;
  // 렌더 중 파생 상태 갱신(React 권장 패턴) — 새로 찾았을 때만 기억을 바꾼다.
  if (foundContinue && foundContinue !== lastContinueBook) setLastContinueBook(foundContinue);
  const continueCandidate =
    foundContinue ?? (lastContinueBook?.id === continueId ? lastContinueBook : null);
  const continueBook =
    continueCandidate && !(stats[continueCandidate.id] && isFinished(stats[continueCandidate.id]))
      ? continueCandidate
      : null;

  const streak = useMemo(
    () =>
      summary
        ? weeklyStreak(new Set([...summary.activeDaysThisWeek, ...summary.activeDaysThisMonth]))
        : null,
    [summary],
  );

  const onBookChanged = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  function resetFilters() {
    setQuery('');
    setDebouncedQ('');
    setCefrFilter('');
  }

  // 케이스 안에 보여 줄 내용 — iOS BookcaseContent와 같은 분기.
  // 같은 프로필에서 필터·검색을 바꾸는 동안에는 이전 목록을 흐리게 유지해 빈 화면 깜빡임을 없앤다.
  const canKeepList =
    result.profileId === activeProfileId && !result.error && result.books.length > 0;
  const content: 'loading' | 'error' | 'books' | 'firstRun' | 'filterEmpty' | 'noProfile' =
    activeProfileId === null && hasHydrated
      ? 'noProfile'
      : loading
        ? canKeepList
          ? 'books'
          : 'loading'
        : hasError
          ? 'error'
          : sortedBooks.length > 0
            ? 'books'
            : hasFilters
              ? 'filterEmpty'
              : 'firstRun';

  const greeting: GreetingSituation | null =
    content === 'loading' || content === 'noProfile'
      ? null
      : content === 'error'
        ? 'loadFailed'
        : content === 'firstRun'
          ? 'firstBook'
          : continueBook
            ? 'continueReading'
            : 'pickABook';

  // 새 동화 레벨 추천(14차) — 필터 없이 받은 목록에서만 계산(필터 중엔 특정 레벨로 치우치므로 나이로 추천).
  const unfiltered = !hasFilters && isCurrent && !hasError;
  const magicBook = (
    <CreateBookDialog
      profileId={activeProfileId}
      onCreated={onBookChanged}
      childName={currentProfile?.name ?? null}
      recentReadLevel={unfiltered ? recentReadLevel(books, stats) : null}
      latestCreatedLevel={unfiltered ? latestCreatedLevel(books) : null}
      trigger={{
        label: '새 동화 만들기',
        className: MAGIC_BOOK_CLASS,
        content: <MagicBookFace />,
      }}
    />
  );
  // 레벨 탭·검색 — 고를 책이 있을 때만(첫 실행·에러·첫 로드엔 숨김). 필터 중 로딩이면 유지.
  const showTabs =
    content === 'books' || content === 'filterEmpty' || (content === 'loading' && hasFilters);

  return (
    <div className="space-y-3.5">
      <ShelfHeader
        childName={currentProfile?.name ?? null}
        streak={streak}
        balance={credits?.balance ?? null}
        balanceUnavailable={!creditsLoading && credits === null}
      />

      <GreetingRow
        situation={greeting}
        childName={currentProfile?.name ?? null}
        continueBook={continueBook}
      />

      <Bookcase busy={loading}>
        {showTabs ? (
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
            <LevelTabs
              value={cefrFilter}
              onChange={setCefrFilter}
              loading={loading}
            />
            <div className="relative w-full sm:max-w-[240px]">
              <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-haru-muted" />
              <input
                ref={searchRef}
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setQuery('');
                    setDebouncedQ('');
                  }
                }}
                placeholder="제목·주제로 찾기"
                aria-label="책장 검색"
                maxLength={80}
                className="h-11 w-full rounded-full border border-haru-wood-front/25 bg-haru-paper/85 pl-9 pr-10 text-sm font-bold text-haru-ink placeholder:text-haru-muted focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring [&::-webkit-search-cancel-button]:hidden"
              />
              {query ? (
                <button
                  type="button"
                  onClick={() => {
                    setQuery('');
                    setDebouncedQ('');
                    searchRef.current?.focus();
                  }}
                  aria-label="검색어 지우기"
                  className="absolute right-0.5 top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-full text-haru-muted hover:text-haru-ink focus-visible:outline-2 focus-visible:outline-ring"
                >
                  <X aria-hidden className="size-4" />
                </button>
              ) : null}
            </div>
          </div>
        ) : null}

        <p role="status" className="sr-only">
          {content === 'loading'
            ? '책을 불러오는 중입니다.'
            : content === 'books' && !loading
              ? `${hasFilters ? '찾은 책' : '책장의 책'} ${sortedBooks.length}권`
              : ''}
        </p>

        {content === 'loading' ? (
          <ShelfSkeleton />
        ) : content === 'noProfile' ? (
          <CaseMessage
            title="누가 읽을 거예요?"
            text="오른쪽 위 아바타를 눌러 프로필을 고르거나 추가해 주세요."
          />
        ) : content === 'error' ? (
          <CaseMessage
            title="책장을 불러오지 못했어요"
            text="연결 상태를 확인한 뒤 다시 시도해 주세요."
            action={
              <Button type="button" variant="outline" onClick={onBookChanged} className="min-h-11 gap-2 rounded-full bg-white/80 px-5">
                <RotateCcw aria-hidden className="size-4" />
                다시 시도
              </Button>
            }
          />
        ) : content === 'filterEmpty' ? (
          <>
            <div className="flex flex-col items-center gap-0.5 pt-3 text-center">
              <p className="text-sm font-bold text-haru-ink">
                {query.trim()
                  ? `“${query.trim()}”에 맞는 책이 아직 없어요`
                  : `${cefrFilter} 레벨 책이 아직 없어요`}
              </p>
              <button
                type="button"
                onClick={resetFilters}
                className="min-h-11 px-3 text-[13px] font-bold text-haru-coral-ink underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-ring"
              >
                전체 보기
              </button>
            </div>
            <ShelfRows>
              <ShelfSlot book={magicBook} />
            </ShelfRows>
          </>
        ) : content === 'firstRun' ? (
          <ShelfRows minRows={2}>
            <ShelfSlot book={magicBook} />
          </ShelfRows>
        ) : (
          <ShelfRows dimmed={loading}>
            <ShelfSlot book={magicBook} />
            {sortedBooks.map((b) => (
              <ShelfSlot
                key={b.id}
                title={b.title}
                book={<ShelfBook book={b} stat={stats[b.id]} onChanged={onBookChanged} />}
              />
            ))}
          </ShelfRows>
        )}
      </Bookcase>

      {content === 'firstRun' && credits ? (
        <p className="text-center text-[13px] font-bold text-haru-muted">
          <span aria-hidden className="text-[#e08a1e]">★ </span>
          별 {credits.balance}개가 있어요 · 한 권에 별 1개
        </p>
      ) : null}

      {/* 책장 밖으로 가는 길 — 네이티브의 아래 탭(단어장·통계) 몫. 데스크톱 헤더 메뉴에는 없어서 여기 둔다. */}
      <nav aria-label="다른 곳으로" className="flex justify-center gap-2 pt-2">
        <Link
          href="/vocab"
          className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-white/85 px-4 text-sm font-bold text-haru-ink shadow-[0_2px_8px_rgb(168_111_63/0.1)] transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none"
        >
          <span aria-hidden>🃏</span>
          단어 카드
        </Link>
        <Link
          href="/stats"
          className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-white/85 px-4 text-sm font-bold text-haru-ink shadow-[0_2px_8px_rgb(168_111_63/0.1)] transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none"
        >
          <span aria-hidden>🌳</span>
          독서 기록
        </Link>
      </nav>
    </div>
  );
}

/** 케이스 안 안내(에러·프로필 없음) — 종이색 판 위에 제목·설명·행동. */
function CaseMessage({
  title,
  text,
  action,
}: {
  title: string;
  text: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-[300px] flex-col items-center justify-center gap-2 px-3 text-center">
      <p className="text-base font-extrabold text-haru-ink">{title}</p>
      <p className="max-w-xs text-[13px] font-bold leading-relaxed text-haru-ink/80">{text}</p>
      {action ? <div className="pt-1">{action}</div> : null}
    </div>
  );
}
