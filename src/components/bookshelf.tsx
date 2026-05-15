'use client';

import Image from 'next/image';
import Link from 'next/link';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
} from 'react';
import { BookOpen, Check, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { BookStackIllustration, EmptyState } from '@/components/ui/empty-state';
import { apiFetch } from '@/lib/api-client';
import type { BookProgressStat } from '@/lib/db/queries';
import type { Book, CefrLevel } from '@/lib/db/schema';
import { useProfileStore } from '@/stores/profile';
import { BookCardMenu } from './book-card-menu';
import { CoverArt } from './cover-art';
import { SectionHeading } from './section-heading';

const IMAGE_GEN_ENABLED = process.env.NEXT_PUBLIC_ENABLE_IMAGE_GEN === 'true';

const CEFRS: CefrLevel[] = ['A1', 'A2', 'B1', 'B2'];

const LEVEL_CLASS: Record<CefrLevel, string> = {
  A1: 'level-a1',
  A2: 'level-a2',
  B1: 'level-b1',
  B2: 'level-b2',
};

function readRecentIds(): number[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem('recent:books');
    const list = raw ? (JSON.parse(raw) as unknown) : [];
    if (!Array.isArray(list)) return [];
    return list.filter((v): v is number => typeof v === 'number');
  } catch {
    return [];
  }
}

// 방문마다 다른 인사말로 친근감 유도. 첫 요소가 SSR 기본값이며
// 클라이언트 mount 후 랜덤 선택으로 교체된다(hydration mismatch 방지).
const BOOKSHELF_PROMPTS = [
  '오늘은 어떤 책을 펼쳐볼까?',
  '어떤 이야기가 궁금해?',
  '마음에 드는 표지가 있을까?',
  '다시 읽고 싶은 책이 있을까?',
  '오늘은 어떤 주인공을 만나볼까?',
  '어떤 책부터 읽어볼래?',
  '기분 따라 한 권 골라볼까?',
  '새로운 친구가 기다리고 있어.',
];

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

/* ---------- Recent Card (compact, 가로 스크롤) ---------- */

function RecentCard({
  book,
  stat,
}: {
  book: Book;
  stat?: BookProgressStat;
}) {
  const hasCover = Boolean(book.coverImagePath);
  const pct = stat ? Math.round(stat.progressRatio * 100) : 0;
  const quizDone = stat?.quizScore !== null && stat?.quizScore !== undefined;
  return (
    <Link
      href={`/book/${book.id}`}
      className="group flex w-40 shrink-0 flex-col gap-2 rounded-xl border border-border bg-card p-2 shadow-sm transition-shadow press-scale hover:shadow-md"
    >
      <div className="relative aspect-[4/3] overflow-hidden rounded-lg">
        {hasCover ? (
          <Image
            src={book.coverImagePath!}
            alt={book.title}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="160px"
          />
        ) : (
          <CoverArt seed={book.id} title={book.title} />
        )}
        <LevelBadge
          level={book.cefr}
          size="xs"
          className="absolute left-1.5 top-1.5"
        />
        {quizDone ? (
          <span
            aria-label="퀴즈 완료"
            className="absolute right-1.5 top-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-[color:var(--level-a1)] text-[color:var(--level-a1-fg)] shadow-sm"
          >
            <Check aria-hidden className="h-3 w-3" />
          </span>
        ) : null}
      </div>
      <div className="px-1">
        <p className="text-xs font-semibold leading-snug">
          {book.title}
        </p>
        {stat ? (
          <div className="mt-1.5 space-y-0.5">
            <Progress value={pct} className="h-1 rounded-full" />
            <p className="text-[10px] text-muted-foreground">
              {quizDone ? `퀴즈 ${stat.quizScore}/5` : `${pct}%`}
            </p>
          </div>
        ) : null}
      </div>
    </Link>
  );
}

/* ---------- Book Card ---------- */

function BookCard({
  book,
  stat,
  onChanged,
}: {
  book: Book;
  stat?: BookProgressStat;
  onChanged: () => void;
}) {
  const hasCover = Boolean(book.coverImagePath);
  const pct = stat ? Math.round(stat.progressRatio * 100) : 0;
  const quizDone = stat?.quizScore !== null && stat?.quizScore !== undefined;
  const progressLabel = !stat
    ? null
    : quizDone
      ? `완독 · 퀴즈 ${stat.quizScore}/5`
      : stat.progressRatio >= 1
        ? '완독'
        : stat.progressRatio > 0
          ? `${pct}% 읽음`
          : null;
  // tilt-3d는 "모든 카드가 움직이는 과잉 마이크로인터랙션"으로 지목되어 제거됨.
  return (
    <article className="stagger-item group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-shadow press-scale hover:shadow-md">
      <Link
        href={`/book/${book.id}`}
        className="flex flex-1 flex-col focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {/* Cover */}
        <div className="relative aspect-[5/3] w-full overflow-hidden">
          {hasCover ? (
            <Image
              src={book.coverImagePath!}
              alt={book.title}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            />
          ) : (
            <CoverArt seed={book.id} title={book.title} />
          )}
          <LevelBadge level={book.cefr} className="absolute left-3 top-3" />
          {!hasCover && IMAGE_GEN_ENABLED ? (
            <CoverGenButton bookId={book.id} onGenerated={onChanged} />
          ) : null}
        </div>

        {/* Body */}
        <div className="relative flex flex-1 flex-col gap-2 p-4">
          {/* 우상단 ⋯ 메뉴 — 본문 영역 기준. 제목은 pr-9로 여백 확보. */}
          <div className="absolute right-3 top-3 z-10">
            <BookCardMenu book={book} onChanged={onChanged} />
          </div>
          <h3 className="pr-9 text-base font-bold leading-snug group-hover:text-primary">
            {book.title}
          </h3>
          {book.topic ? (
            <p className="text-sm text-muted-foreground">
              {book.topic}
            </p>
          ) : null}
          {/* 진도 — stat이 있을 때만 노출. 퀴즈 완료는 체크 배지 + 점수. */}
          {stat ? (
            <div className="mt-auto space-y-1 pt-2">
              <Progress
                value={pct}
                className="h-1.5 rounded-full"
                aria-label={progressLabel ?? '진도'}
              />
              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                <span className="inline-flex items-center gap-1 font-medium">
                  {quizDone ? (
                    <Check
                      aria-hidden
                      className="h-3 w-3 text-[color:var(--level-a1-fg)]"
                    />
                  ) : null}
                  <span>{progressLabel}</span>
                </span>
                <time>
                  {new Date(book.createdAt).toLocaleDateString('ko-KR')}
                </time>
              </div>
            </div>
          ) : (
            <div className="mt-auto flex items-center justify-between pt-2 text-[11px] text-muted-foreground">
              <span className="font-medium">아직 안 읽음</span>
              <time>
                {new Date(book.createdAt).toLocaleDateString('ko-KR')}
              </time>
            </div>
          )}
        </div>
      </Link>
    </article>
  );
}

function CoverGenButton({
  bookId,
  onGenerated,
}: {
  bookId: number;
  onGenerated: () => void;
}) {
  const [loading, setLoading] = useState(false);

  async function handle(e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (loading) return;
    setLoading(true);
    toast.info('AI가 표지를 그리는 중… (30~60초)');
    try {
      await apiFetch(`/api/image/book/${bookId}/cover`, { method: 'POST' });
      toast.success('표지 완성');
      onGenerated();
    } catch (err) {
      toast.error(`표지 생성 실패: ${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handle}
      disabled={loading}
      aria-label="AI로 표지 그리기"
      className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-md bg-background/90 px-3 py-1.5 text-xs font-semibold text-foreground shadow-sm backdrop-blur press-scale hover:bg-background disabled:opacity-70"
    >
      {loading ? '그리는 중…' : '표지 만들기'}
    </button>
  );
}

/* ---------- Filter helpers ---------- */

function FilterGroup({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-medium text-muted-foreground">
        {label}
      </span>
      {children}
    </div>
  );
}

function LevelPill({
  children,
  level,
  active,
  onClick,
}: {
  children: React.ReactNode;
  level?: CefrLevel;
  active: boolean;
  onClick: () => void;
}) {
  const lvlClass = level ? LEVEL_CLASS[level] : '';
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`relative rounded px-3 py-1 text-xs font-semibold transition ${
        active
          ? `${lvlClass || 'bg-primary text-primary-foreground'} shadow-sm`
          : 'text-muted-foreground hover:bg-muted'
      }`}
    >
      {children}
    </button>
  );
}

/**
 * 레벨 배지 — 색 + dot/mark 이중 인코딩.
 * globals.css의 `.level-dots[data-level]` 규칙이 레벨별 점/마크를 렌더한다.
 * 색맹·동일 화면에 여러 레벨 공존 시 혼동 방지.
 */
export function LevelBadge({
  level,
  size = 'sm',
  className,
}: {
  level: CefrLevel;
  size?: 'xs' | 'sm';
  className?: string;
}) {
  const pad = size === 'xs' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-xs';
  return (
    <span
      className={`${LEVEL_CLASS[level]} ${pad} inline-flex items-center rounded-full font-bold shadow-sm ${className ?? ''}`}
    >
      {level}
      <span className="level-dots" data-level={level} aria-hidden />
    </span>
  );
}

/* ---------- States ---------- */

/**
 * 책장 그리드 placeholder.
 * Bookshelf 자체 fetch loading 상태와 `app/loading.tsx`(RSC fallback) 양쪽에서
 * 동일하게 쓰이도록 export. 두 곳에서 모양이 다르면 RSC 도착 직전에 placeholder가
 * 한 번 더 점프하는 인상을 주어 "스플래시 두 번" 피드백이 발생했었다(2026-04-26).
 */
export function SkeletonGrid() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="overflow-hidden rounded-2xl border border-border/60 bg-card"
        >
          <div className="shimmer aspect-[5/3] w-full" />
          <div className="space-y-2 p-4">
            <div className="shimmer h-4 w-3/4 rounded" />
            <div className="shimmer h-3 w-1/2 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}
