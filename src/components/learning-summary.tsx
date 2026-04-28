'use client';

import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';
import {
  ArrowRight,
  BarChart3,
  BookMarked,
  BookOpen,
  CalendarDays,
  LibraryBig,
  Sparkles,
  Trophy,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api-client';
import { Progress } from '@/components/ui/progress';
import type {
  BookProgressStat,
  LearningSummary as Summary,
} from '@/lib/db/queries';
import type { Book, Profile } from '@/lib/db/schema';
import { useProfileStore } from '@/stores/profile';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { CoverArt } from './cover-art';
import { CreateBookDialog } from './create-book-dialog';

/**
 * 한국어 호격조사(vocative) 분기.
 * - 받침 있는 이름(종성 존재) → "아" (예: 수빈 → 수빈아, 민수 → 민수야? 아님 민수 → 민수야. 수빈→수빈아)
 * - 받침 없는 이름 → "야" (예: 지호 → 지호야, 민서 → 민서야)
 * - 한글 음절이 아닌 끝자(영문·숫자)는 안전하게 "야"로 폴백.
 *
 * 한글 음절 블록: U+AC00 ~ U+D7A3. `(code - 0xAC00) % 28`이 0이면 종성 없음.
 */
function vocative(name: string): string {
  if (!name) return '';
  const last = name[name.length - 1];
  const code = last.charCodeAt(0);
  if (code < 0xac00 || code > 0xd7a3) return `${name}야`;
  const hasJongseong = (code - 0xac00) % 28 !== 0;
  return `${name}${hasJongseong ? '아' : '야'}`;
}

// 학습 지표 없는 신규 사용자용 인사말 — 방문마다 다른 문구로 친근감 유도.
// 첫 요소가 SSR 기본값이며 클라이언트 mount 후 랜덤 교체(hydration 안전).
const HERO_PROMPTS = [
  '책장에서 골라도 좋고, 새 이야기를 만들어도 좋아.',
  '책장을 둘러봐도 되고, 오늘 이야기를 새로 만들어도 돼.',
  '읽고 싶은 책을 찾아보거나, 새 이야기를 시작해볼까?',
  '좋아하는 책을 펴도, 새 이야기를 만들어도 좋아.',
  '책장에 있는 친구를 만나도, 새 친구를 불러와도 괜찮아.',
  '한 권 골라볼래? 아니면 새 이야기를 만들어볼까?',
  '원하는 책을 열어봐도, 오늘 새 이야기를 써도 좋아.',
  '책장을 열어볼까, 아니면 새로 시작해볼까?',
];

/**
 * 홈 상단의 인삿말 + 실데이터 학습 요약.
 * Round 2~3 토론 결과:
 *  - 하드코딩 "오늘의 추천 레벨·A1" 제거 (P0)
 *  - 실제 reading_logs 기반 Hero는 P1-1
 *  - 이어 읽기: 서버의 "진행 중" 세션이 있으면 우선, 없으면 localStorage recent:books 첫번째
 */
export function LearningSummary() {
  const profileId = useProfileStore((s) => s.currentProfileId);
  const [name, setName] = useState<string | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [recentId, setRecentId] = useState<number | null>(null);
  const [continueBook, setContinueBook] = useState<Book | null>(null);
  const [continueStat, setContinueStat] = useState<BookProgressStat | null>(
    null,
  );
  /**
   * visibility 복귀·focus 시 모든 fetch를 한 번 더 돌리기 위한 카운터.
   * Reader에서 진도를 갱신한 뒤 홈으로 돌아오면 continueStat이 최신값으로 교체된다.
   */
  const [refreshKey, setRefreshKey] = useState(0);

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

  // 프로필 이름 조회
  useEffect(() => {
    if (!profileId) return;
    let cancelled = false;
    apiFetch<{ profiles: Profile[] }>('/api/profiles')
      .then((res) => {
        if (cancelled) return;
        setName(res.profiles.find((p) => p.id === profileId)?.name ?? null);
      })
      .catch(() => void 0);
    return () => {
      cancelled = true;
    };
  }, [profileId]);

  // 요약 집계
  useEffect(() => {
    if (!profileId) return;
    let cancelled = false;
    apiFetch<{ summary: Summary }>(
      `/api/learning-summary?profileId=${profileId}`,
    )
      .then((res) => {
        if (cancelled) return;
        setSummary(res.summary);
      })
      .catch(() => void 0);
    return () => {
      cancelled = true;
    };
  }, [profileId, refreshKey]);

  // localStorage 기반 "가장 최근에 연 책" — 서버의 continueBookId 보조
  useEffect(() => {
    if (typeof window === 'undefined') return;
    let cancelled = false;
    try {
      const raw = window.localStorage.getItem('recent:books');
      const list = raw ? (JSON.parse(raw) as unknown) : [];
      const nextRecentId =
        Array.isArray(list) && typeof list[0] === 'number' ? list[0] : null;
      window.requestAnimationFrame(() => {
        if (!cancelled) setRecentId(nextRecentId);
      });
    } catch {
      window.requestAnimationFrame(() => {
        if (!cancelled) setRecentId(null);
      });
    }
    return () => {
      cancelled = true;
    };
  }, [profileId, refreshKey]);

  const visibleSummary = profileId ? summary : null;
  const continueId = profileId
    ? (visibleSummary?.continueBookId ?? recentId)
    : null;
  const visibleName = profileId ? name : null;
  const visibleContinueBook =
    continueId && continueBook?.id === continueId ? continueBook : null;
  const visibleContinueStat = visibleContinueBook ? continueStat : null;
  const hasAnyStat =
    visibleSummary &&
    (visibleSummary.totalBooksRead > 0 ||
      visibleSummary.totalFinishedSessions > 0 ||
      visibleSummary.totalPerfectScores > 0);

  // 이어 읽기 대상 책 메타 + 최신 진도 스탯 로드.
  // /api/books?profileId=X 응답의 stats에서 continueId 책의 진도를 추출.
  useEffect(() => {
    if (!profileId || !continueId) return;
    let cancelled = false;
    // 책 메타 — 단건 조회
    apiFetch<{ book: Book }>(`/api/books/${continueId}`)
      .then((res) => {
        if (!cancelled) setContinueBook(res.book);
      })
      .catch(() => void 0);
    // 최신 진도 — 책장 응답에서 해당 id의 stat만 사용
    apiFetch<{ stats: Record<number, BookProgressStat> }>(
      `/api/books?profileId=${profileId}`,
    )
      .then((res) => {
        if (!cancelled) setContinueStat(res.stats?.[continueId] ?? null);
      })
      .catch(() => void 0);
    return () => {
      cancelled = true;
    };
  }, [profileId, continueId, refreshKey]);

  return (
    <section className="animate-fade-up relative overflow-hidden rounded-[1.5rem] border-2 border-border bg-card/80 p-5 sticker-shadow-lg sm:p-6">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-1.5 bg-[linear-gradient(90deg,var(--primary),var(--accent),var(--level-b1))]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,color-mix(in_oklch,var(--primary)_13%,transparent),transparent_28%,color-mix(in_oklch,var(--accent)_10%,transparent)_74%,transparent)]"
      />
      <div className="relative grid grid-cols-1 gap-6 md:grid-cols-[minmax(0,1.08fr)_minmax(320px,0.92fr)] md:items-start md:gap-8">
        {/* 좌: 인사말 + 지표 + 이어 읽기 */}
        <div className="min-w-0">
          <div className="space-y-3">
            <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-primary">
              <Sparkles aria-hidden className="size-3.5" />
              오늘의 독서 데스크
            </span>
            <div className="space-y-2">
              <h1 className="max-w-[12ch] text-3xl font-extrabold leading-[1.02] tracking-tight sm:text-5xl">
                {visibleName
                  ? `${vocative(visibleName)}, 오늘 뭐 읽을까?`
                  : '오늘 뭐 읽을까?'}
              </h1>
              <p className="max-w-xl text-sm font-medium leading-relaxed text-muted-foreground sm:text-base">
                {visibleContinueBook
                  ? '읽던 책을 이어가거나, 단어장을 짧게 복습하고 다음 이야기로 넘어가 보세요.'
                  : HERO_PROMPTS[0]}
              </p>
            </div>
          </div>

          {/* 지표 카드 — 좌측 컬럼 폭 전체 사용(이어 읽기 카드와 너비 일치) */}
          {hasAnyStat ? (
            <div className="mt-5 grid grid-cols-3 gap-2 sm:gap-3">
              <StatCard
                label="읽은 책"
                value={visibleSummary!.totalBooksRead}
                unit="권"
                icon={<LibraryBig aria-hidden className="size-4" />}
                tone="gold"
              />
              <StatCard
                label="만점"
                value={visibleSummary!.totalPerfectScores}
                unit="회"
                icon={<Trophy aria-hidden className="size-4" />}
                tone="green"
              />
              <StatCard
                label="평균 정답률"
                value={
                  visibleSummary!.averageAccuracy !== null
                    ? Math.round(visibleSummary!.averageAccuracy * 100)
                    : null
                }
                unit="%"
                icon={<BarChart3 aria-hidden className="size-4" />}
                tone="blue"
              />
            </div>
          ) : (
            <div className="mt-5 rounded-2xl border border-dashed border-border/80 bg-background/50 p-4">
              <p className="text-sm font-medium leading-relaxed text-muted-foreground">
                첫 기록은 한 권이면 충분합니다. 새 책을 만들거나 책장에서 마음에 드는 표지를 골라 시작해 보세요.
              </p>
            </div>
          )}

          {/* 이어 읽기 카드 — 현재 진행 중이거나 최근 열람한 책 */}
          {visibleContinueBook ? (
            <ContinueCard
              book={visibleContinueBook}
              stat={visibleContinueStat}
              isInProgress={
                visibleSummary?.continueBookId === visibleContinueBook.id
              }
            />
          ) : null}

          {/* 빠른 단축 — 위계: primary(새 동화) > outline-accent(단어장) > ghost(통계).
              한 화면 1 primary 원칙: CreateBookDialog만 강조, 나머지는 보조 액션으로 톤다운. */}
          <div className="mt-4 grid gap-2 sm:grid-cols-[minmax(0,1.08fr)_minmax(0,1fr)_auto] [&_[data-slot=button]]:h-10 [&_[data-slot=button]]:w-full">
            <CreateBookDialog profileId={profileId} />
            <Link
              href="/vocab"
              className={cn(
                buttonVariants({ variant: 'outline', size: 'lg' }),
                'h-10 justify-center border-[color:var(--accent)]/40 bg-[color:var(--accent)]/10 text-[color:var(--accent)] press-scale hover:bg-[color:var(--accent)]/20 hover:text-[color:var(--accent)]',
              )}
            >
              <BookOpen aria-hidden className="h-4 w-4" />
              단어장 복습
            </Link>
            <Link
              href="/stats"
              className={cn(
                buttonVariants({ variant: 'ghost', size: 'lg' }),
                'h-10 justify-center press-scale text-foreground/70 hover:text-foreground',
              )}
            >
              <BarChart3 aria-hidden className="h-4 w-4" />
              통계
            </Link>
          </div>
        </div>

        {/* 우: 월간 캘린더 — md 이상에선 오른쪽 컬럼, 모바일에선 세로 아래. */}
        {visibleSummary ? (
          <MonthlyTrace
            month={visibleSummary.thisMonth}
            activeDays={visibleSummary.activeDaysThisMonth}
          />
        ) : null}
      </div>
    </section>
  );
}

/**
 * 이번 달 달력. 활동이 있던 날만 색칠.
 * 숫자 streak/압박 문구 없이 "이번 달을 한눈에 본다"는 용도.
 *
 * month: "YYYY-MM" 형식. 해당 달의 1일 ~ 말일까지 렌더.
 */
const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

function MonthlyTrace({
  month,
  activeDays,
}: {
  month: string;
  activeDays: string[];
}) {
  const [y, m] = month.split('-').map(Number);
  const first = new Date(y, m - 1, 1);
  const last = new Date(y, m, 0);
  const daysInMonth = last.getDate();
  const leadingBlanks = first.getDay(); // 0=일 ~ 6=토
  const activeSet = new Set(activeDays);
  const todayYmd = new Date().toISOString().slice(0, 10);

  // 요일 헤더 + 앞쪽 공백 셀 + 날짜 셀. 6주 x 7일 = 최대 42칸.
  const cells: Array<{ ymd: string; day: number } | null> = [];
  for (let i = 0; i < leadingBlanks; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const ymd = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    cells.push({ ymd, day: d });
  }
  // 다음 달 첫 주까지 나머지는 빈 칸으로 채워 폭 일관.
  while (cells.length % 7 !== 0) cells.push(null);

  const activeCount = activeDays.length;

  return (
    <div className="w-full rounded-2xl border-2 border-border/80 bg-background/70 p-4 sticker-shadow md:ml-auto">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <span
            aria-hidden
            className="mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary"
          >
            <CalendarDays className="size-4" />
          </span>
          <div>
            <h3 className="text-lg font-bold tracking-tight sm:text-xl">
              {y}년 {m}월 흔적
            </h3>
            <p className="text-xs font-medium text-muted-foreground">
              {activeCount > 0 ? `${activeCount}일 활동했어요` : '첫 활동을 기다리는 중'}
            </p>
          </div>
        </div>
        <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold tabular-nums text-muted-foreground">
          {activeCount}/{daysInMonth}
        </span>
      </div>
      <div className="grid grid-cols-7 gap-1">
        {WEEKDAY_LABELS.map((w, i) => (
          <div
            key={w}
            className={`text-center text-[10px] font-medium ${
              i === 0
                ? 'text-[color:var(--destructive)]/70'
                : 'text-muted-foreground'
            }`}
          >
            {w}
          </div>
        ))}
        {cells.map((c, i) =>
          c === null ? (
            <div
              key={`blank-${i}`}
              className="aspect-[4/3]"
              aria-hidden
            />
          ) : (
            <div
              key={c.ymd}
              className="relative flex aspect-[4/3] items-center justify-center"
              title={`${c.ymd}${activeSet.has(c.ymd) ? ' · 활동' : ''}`}
            >
              <div
                className={`flex h-full w-full items-center justify-center rounded-md border text-xs transition-colors sm:text-sm ${
                  activeSet.has(c.ymd)
                    ? 'border-transparent bg-primary font-bold text-primary-foreground sticker-shadow-primary'
                    : c.ymd === todayYmd
                      ? 'border-dashed border-border bg-transparent font-semibold text-foreground'
                      : 'border-transparent bg-muted text-muted-foreground'
                }`}
                aria-label={`${c.ymd}${activeSet.has(c.ymd) ? ' 활동 있음' : ' 활동 없음'}`}
              >
                {c.day}
              </div>
            </div>
          ),
        )}
      </div>
    </div>
  );
}

/**
 * 이어 읽기 카드 — 가로 레이아웃.
 * 좌: 썸네일(실제 커버 or seeded CoverArt) / 우: 제목·진도·CTA.
 * 진행 중 세션이면 정확한 진도 %를, 최근 연 책이면 "최근 연 책"으로 안내.
 */
function ContinueCard({
  book,
  stat,
  isInProgress,
}: {
  book: Book;
  stat: BookProgressStat | null;
  isInProgress: boolean;
}) {
  const hasCover = Boolean(book.coverImagePath);
  const pct = stat ? Math.round(stat.progressRatio * 100) : 0;
  const quizDone =
    stat?.quizScore !== null && stat?.quizScore !== undefined;
  const label = !stat
    ? isInProgress
      ? '읽는 중'
      : '최근 연 책'
    : quizDone
      ? `완독 · 퀴즈 ${stat.quizScore}/5`
      : stat.progressRatio >= 1
        ? '완독'
        : stat.progressRatio > 0
          ? `${pct}% 읽음`
          : '읽는 중';
  return (
    <Link
      href={`/book/${book.id}`}
      className="group mt-5 flex items-stretch gap-3 rounded-2xl border-2 border-border/80 bg-background/70 p-2.5 transition-shadow press-scale hover:border-primary/40 hover:shadow-md"
    >
      <div className="relative h-20 w-28 shrink-0 overflow-hidden rounded-xl border border-border/50 bg-muted">
        {hasCover ? (
          <Image
            src={book.coverImagePath!}
            alt={book.title}
            fill
            className="object-cover"
            sizes="96px"
          />
        ) : (
          <CoverArt seed={book.id} title={book.title} />
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col justify-between gap-1 py-0.5">
        <div>
          <p className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-[0.12em] text-primary">
            <BookMarked aria-hidden className="size-3.5" />
            {isInProgress ? '이어 읽기' : '다시 보기'}
          </p>
          <p className="mt-0.5 text-sm font-bold">
            {book.title}
          </p>
        </div>
        {/* stat이 있으면 진도 bar + 라벨 동시 표시. 0%·100%에서도 bar를 보여 위계 유지. */}
        {stat ? (
          <div className="space-y-0.5">
            <Progress value={pct} className="h-1.5 rounded-full" />
            <p className="text-[11px] text-muted-foreground">{label}</p>
          </div>
        ) : (
          <p className="text-[11px] text-muted-foreground">{label}</p>
        )}
      </div>
      <span
        aria-hidden
        className="self-center text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary"
      >
        <ArrowRight className="size-4" />
      </span>
    </Link>
  );
}

function StatCard({
  label,
  value,
  unit,
  icon,
  tone,
}: {
  label: string;
  value: number | null;
  unit: string;
  icon: ReactNode;
  tone: 'gold' | 'green' | 'blue';
}) {
  const toneClass = {
    gold: 'bg-primary/15 text-primary',
    green: 'bg-[color:var(--level-a1)] text-[color:var(--level-a1-fg)]',
    blue: 'bg-[color:var(--accent)]/15 text-[color:var(--accent)]',
  }[tone];

  return (
    <div className="rounded-2xl border border-border/70 bg-background/70 p-3">
      <div className="flex items-center gap-2">
        <span
          className={cn(
            'inline-flex size-8 items-center justify-center rounded-full',
            toneClass,
          )}
        >
          {icon}
        </span>
        <div className="min-w-0 text-xs font-bold uppercase tracking-[0.08em] text-muted-foreground sm:text-sm">
          {label}
        </div>
      </div>
      <div className="mt-2.5 text-3xl font-extrabold leading-none tabular-nums sm:text-4xl">
        {value ?? '—'}
        <span className="ml-1 text-sm font-semibold text-muted-foreground sm:text-base">
          {unit}
        </span>
      </div>
    </div>
  );
}
