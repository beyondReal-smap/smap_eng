'use client';

import Link from 'next/link';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { BookOpen, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { BookStackIllustration, EmptyState } from '@/components/ui/empty-state';
import { apiFetch } from '@/lib/api-client';
import type { BookProgressStat } from '@/lib/db/queries';
import type { Book, CefrLevel } from '@/lib/db/schema';
import { useProfileStore } from '@/stores/profile';
import { SectionHeading } from './section-heading';
import {
  BookCard,
  FilterGroup,
  LevelPill,
  RecentCard,
  SkeletonGrid,
} from './bookshelf/components';
import {
  BOOKSHELF_PROMPTS,
  CEFRS,
  readRecentIds,
} from './bookshelf/shared';

// 외부(app/loading.tsx 등)가 '@/components/bookshelf'에서 import하던 공개 컴포넌트 재노출.
export { LevelBadge } from './bookshelf/components';
export { SkeletonGrid };

/**
 * SSR 단계의 (app)/page.tsx가 active profile 기준으로 미리 페치한 책 목록·진도
 * stats를 prop으로 받는다. 클라이언트는 zustand의 currentProfileId가 server가
 * 활성으로 본 프로필과 다를 때만 재페치하고, 같으면 initial props 그대로 사용해
 * 첫 paint부터 layout shift 없이 그려진다.
 *
 * prop 없이도(다른 페이지에서 단독 사용 등) 종래대로 useEffect fetch에 fallback.
 */
export function Bookshelf({
  initialProfileId = null,
  initialBooks = [],
  initialStats = {},
}: {
  initialProfileId?: number | null;
  initialBooks?: Book[];
  initialStats?: Record<number, BookProgressStat>;
} = {}) {
  const hasHydrated = useProfileStore((s) => s.hasHydrated);
  const profileId = useProfileStore((s) => s.currentProfileId);
  const [books, setBooks] = useState<Book[]>(initialBooks);
  const [stats, setStats] =
    useState<Record<number, BookProgressStat>>(initialStats);
  // initial 데이터가 들어왔으면 loading=false로 시작 — SkeletonGrid가 잠시 깜빡이는
  // 회귀(2026-05-14 피드백)를 막는다. prop 없는 단독 사용 시에는 종래대로 true.
  const [loading, setLoading] = useState(initialBooks.length === 0);
  const [cefrFilter, setCefrFilter] = useState<string>('');
  const [query, setQuery] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [recentIds, setRecentIds] = useState<number[]>([]);
  const [prompt, setPrompt] = useState(BOOKSHELF_PROMPTS[0]);

  // 클라이언트에서만 랜덤 선택 — SSR은 배열 첫 요소 유지해 hydration 안전.
  useEffect(() => {
    setPrompt(
      BOOKSHELF_PROMPTS[Math.floor(Math.random() * BOOKSHELF_PROMPTS.length)],
    );
  }, []);

  // 검색어 debounce (200ms) — 입력 중 과다 fetch 방지.
  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedQ(query.trim()), 200);
    return () => window.clearTimeout(t);
  }, [query]);

  useEffect(() => {
    setRecentIds(readRecentIds());
  }, [refreshKey]);

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
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', bump);
    window.addEventListener('pageshow', bump);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', bump);
      window.removeEventListener('pageshow', bump);
    };
  }, []);

  useEffect(() => {
    // hydration 전엔 fetch 보류 — 그 동안엔 loading=true가 유지되어 SkeletonGrid 표시.
    if (!hasHydrated) return;
    if (!profileId) {
      setBooks([]);
      // 프로필이 영구히 없는 사용자가 SkeletonGrid에 갇히지 않도록 false로 풀어준다.
      setLoading(false);
      return;
    }
    // SSR이 prop으로 넘긴 초기 데이터가 현재 활성 프로필과 일치하고 필터/검색이
    // 기본값이며 refresh가 트리거되지 않은 첫 진입이라면, 동일한 응답을 다시
    // 받으려고 fetch하지 않는다(= 첫 paint 직후 setBooks가 다시 호출돼 일어나는
    // 무의미한 리렌더·layout shift 방지). 한 번이라도 필터·refreshKey가 바뀌면
    // 그때부터는 평소대로 fetch.
    const matchesInitial =
      refreshKey === 0 &&
      cefrFilter === '' &&
      debouncedQ === '' &&
      initialProfileId !== null &&
      initialProfileId === profileId &&
      initialBooks.length > 0;
    if (matchesInitial) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const params = new URLSearchParams({ profileId: profileId.toString() });
    if (cefrFilter) params.set('cefr', cefrFilter);
    if (debouncedQ) params.set('q', debouncedQ);
    apiFetch<{
      books: Book[];
      stats: Record<number, BookProgressStat>;
    }>(`/api/books?${params}`)
      .then((res) => {
        setBooks(res.books);
        setStats(res.stats ?? {});
      })
      .catch((err) => toast.error(`책장 로드 실패: ${err.message}`))
      .finally(() => setLoading(false));
  }, [
    hasHydrated,
    profileId,
    cefrFilter,
    debouncedQ,
    refreshKey,
    initialProfileId,
    initialBooks.length,
  ]);

  // 최신순 고정 — 정렬 드롭다운 제거(프로필별로 연령 고정이라 정렬이 큰 의미 없음)
  const sortedBooks = useMemo(() => {
    return [...books].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }, [books]);

  const recentBooks = useMemo(() => {
    if (recentIds.length === 0) return [];
    const map = new Map(books.map((b) => [b.id, b]));
    return recentIds
      .map((id) => map.get(id))
      .filter((b): b is Book => Boolean(b))
      .slice(0, 6);
  }, [books, recentIds]);

  const onBookChanged = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  return (
    <section className="space-y-6">
      {/* 페이지 헤더 카드 — 페이지 타이틀 + 검색/필터 툴바를 하나의 컨테이너로 묶어
          하단의 "최근 읽은 책 / 전체 책" 카드들과 시각적 위계를 일치시킨다.
          이전에는 SectionHeading과 툴바가 각자 떠 있어 헤더 영역이 어색했다. */}
      <header className="rounded-2xl border border-border/60 bg-card/60 p-5 shadow-sm sm:p-6">
        <SectionHeading title="책장" description={prompt} />
        <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-border/60 pt-4">
          <div className="relative min-w-[200px] flex-1 sm:flex-none sm:w-[260px]">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="제목 또는 주제로 검색"
              aria-label="책장 검색"
              className="h-9 rounded-md pl-9"
              maxLength={80}
            />
            <span
              aria-hidden
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground"
            >
              🔎
            </span>
            {query ? (
              <button
                type="button"
                onClick={() => setQuery('')}
                aria-label="검색어 지우기"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded px-1 text-xs text-muted-foreground hover:text-foreground"
              >
                ✕
              </button>
            ) : null}
          </div>
          <FilterGroup label="수준">
            <div className="flex flex-wrap gap-1 rounded-md border border-border bg-card p-1">
              <LevelPill
                active={cefrFilter === ''}
                onClick={() => setCefrFilter('')}
              >
                전체
              </LevelPill>
              {CEFRS.map((c) => (
                <LevelPill
                  key={c}
                  level={c}
                  active={cefrFilter === c}
                  onClick={() => setCefrFilter(cefrFilter === c ? '' : c)}
                >
                  {c}
                </LevelPill>
              ))}
            </div>
          </FilterGroup>
        </div>
      </header>

      {/* 최근 읽기 (localStorage 기반) — 검색 중이 아닐 때만.
          전체 책장과 명확히 구분되도록 카드 컨테이너 + accent 헤더(Clock 아이콘)로 분리.
          가로 스크롤은 컨테이너 padding을 -mx로 상쇄해 모바일에서 화면 끝까지 흐른다. */}
      {!debouncedQ && recentBooks.length > 0 ? (
        <section
          aria-labelledby="bookshelf-recent-heading"
          className="animate-fade-up rounded-2xl border border-border/60 bg-card/60 p-5 shadow-sm sm:p-6"
        >
          <header className="mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span
                aria-hidden
                className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary"
              >
                <Clock className="h-4 w-4" />
              </span>
              <h3
                id="bookshelf-recent-heading"
                className="text-base font-bold tracking-tight sm:text-lg"
              >
                최근 읽은 책
              </h3>
            </div>
            <span className="text-[11px] font-medium text-muted-foreground">
              최대 6권
            </span>
          </header>
          <div className="-mx-5 flex gap-3 overflow-x-auto px-5 pb-1 sm:-mx-6 sm:px-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {recentBooks.map((b) => (
              <RecentCard key={b.id} book={b} stat={stats[b.id]} />
            ))}
          </div>
        </section>
      ) : null}

      {/* 전체 책장 */}
      {/* hydration 전이거나 fetch 중에는 무조건 SkeletonGrid 우선.
          이전엔 !profileId가 우선이라 hydration 직전 EmptyState가 깜빡인 후
          SkeletonGrid → 데이터 순으로 박스 안 콘텐츠가 두 번 점프했다. */}
      {!hasHydrated || loading ? (
        <SkeletonGrid />
      ) : !profileId ? (
        <EmptyState
          title="누가 읽을 거예요?"
          text="먼저 프로필을 선택하거나 추가해 주세요."
        />
      ) : sortedBooks.length === 0 ? (
        <EmptyState
          illustration={<BookStackIllustration />}
          title={debouncedQ ? '검색 결과가 없어요' : '책장이 비어있어요'}
          text={
            debouncedQ
              ? '다른 검색어로 시도해 보거나 검색어를 지워 전체 책을 보세요.'
              : '"새 동화 만들기"로 첫 이야기를 시작해 봐.'
          }
        />
      ) : (
        <section
          aria-labelledby="bookshelf-all-heading"
          className="rounded-2xl border border-border/60 bg-card/60 p-5 shadow-sm sm:p-6"
        >
          <header className="mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span
                aria-hidden
                className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-secondary/60 text-secondary-foreground"
              >
                <BookOpen className="h-4 w-4" />
              </span>
              <h3
                id="bookshelf-all-heading"
                className="text-base font-bold tracking-tight sm:text-lg"
              >
                {debouncedQ ? '검색 결과' : '전체 책'}
              </h3>
            </div>
            <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold tabular-nums text-muted-foreground">
              {sortedBooks.length}권
            </span>
          </header>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {sortedBooks.map((b) => (
              <BookCard
                key={b.id}
                book={b}
                stat={stats[b.id]}
                onChanged={onBookChanged}
              />
            ))}
          </div>
        </section>
      )}
    </section>
  );
}
