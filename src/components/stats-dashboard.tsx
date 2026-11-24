'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { Mascot, TabHeader } from '@/components/haru';
import { apiFetch } from '@/lib/api-client';
import type {
  BookProgressStat,
  LearningSummary as Summary,
  VocabEntry,
} from '@/lib/db/queries';
import type { Book, Profile } from '@/lib/db/schema';
import { APP_HOME } from '@/lib/paths';
import { computePoints } from '@/lib/rewards';
import { currentLevel, levelRows } from '@/lib/stats/records';
import { weeklyStreak } from '@/lib/weekly-streak';
import { useProfileStore } from '@/stores/profile';
import { AdventurePath } from './stats/adventure-path';
import { MiniStats, ReadingTree } from './stats/reading-tree';
import { StampBoard, StreakChip } from './stats/stamp-board';
import { StickerBook } from './stats/sticker-book';

interface Loaded {
  profileId: number;
  summary: Summary;
  books: Book[];
  stats: Record<number, BookProgressStat>;
  vocab: VocabEntry[];
}

/**
 * 통계 탭 — "{이름}의 독서 기록"(그림책 세계, 네이티브 7차와 같은 구성).
 * 숫자 타일 대신 아이가 한눈에 즐길 수 있는 그림: 독서 나무(완독 = 열매) + 미니 수치 → 칭찬 도장판 →
 * 스티커 북(배지) → 레벨 모험 길. 아래에 웹에서 쓰던 "최근 퀴즈" 목록을 보호자용으로 남긴다.
 *
 * 데이터는 기존 API 3개 그대로: /api/learning-summary · /api/books(진도 stats) · /api/vocab(첫 실행 판정).
 */
export function StatsDashboard({ initialProfiles = [] }: { initialProfiles?: Profile[] }) {
  const hasHydrated = useProfileStore((s) => s.hasHydrated);
  const storeProfileId = useProfileStore((s) => s.currentProfileId);
  // 저장된 프로필이 없으면 첫 프로필(ProfileSwitcher가 곧 고르는 값)을 쓴다 — 책장과 같은 규칙.
  const profileId = hasHydrated ? (storeProfileId ?? initialProfiles[0]?.id ?? null) : null;
  const profileName = initialProfiles.find((p) => p.id === profileId)?.name ?? null;

  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [error, setError] = useState<{ profileId: number; message: string } | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (profileId === null) return;
    const controller = new AbortController();
    const { signal } = controller;
    Promise.all([
      apiFetch<{ summary: Summary }>(`/api/learning-summary?profileId=${profileId}`, { signal }),
      apiFetch<{ books: Book[]; stats: Record<number, BookProgressStat> }>(
        `/api/books?profileId=${profileId}`,
        { signal },
      ),
      apiFetch<{ entries: VocabEntry[] }>(`/api/vocab?profileId=${profileId}`, { signal }),
    ])
      .then(([a, b, c]) => {
        setLoaded({ profileId, summary: a.summary, books: b.books, stats: b.stats ?? {}, vocab: c.entries });
        setError(null);
      })
      .catch((err: unknown) => {
        if (signal.aborted) return;
        console.error('[stats] load failed:', err);
        setError({ profileId, message: (err as Error).message });
      });
    return () => controller.abort();
  }, [profileId, reloadKey]);

  const data = loaded && loaded.profileId === profileId ? loaded : null;
  const failed = error && error.profileId === profileId && !data;
  const retry = useCallback(() => {
    setError(null);
    setReloadKey((k) => k + 1);
  }, []);

  const streak = useMemo(
    () =>
      data
        ? weeklyStreak(new Set([...data.summary.activeDaysThisWeek, ...data.summary.activeDaysThisMonth])).streak
        : 0,
    [data],
  );

  const title = profileName ? `${profileName}의 독서 기록` : '독서 기록';
  const header = (
    <TabHeader title={title} trailing={streak >= 2 ? <StreakChip streak={streak} variant="header" /> : null} />
  );

  if (hasHydrated && profileId === null) {
    return (
      <>
        {header}
        <StateMessage pose="normal" title="누가 볼 거예요?" text="먼저 오른쪽 위에서 프로필을 골라 주세요." />
      </>
    );
  }
  if (failed) {
    return (
      <>
        {header}
        <StateMessage
          pose="worried"
          title="독서 기록을 열지 못했어요"
          text="연결 상태를 확인한 뒤 다시 시도해 주세요."
          action={
            <button
              type="button"
              onClick={retry}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-full border-2 border-[#ebc9b6] bg-white/80 px-5 text-sm font-extrabold text-haru-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <RotateCcw aria-hidden className="size-4" />
              다시 시도
            </button>
          }
        />
      </>
    );
  }
  if (!data) {
    return (
      <>
        {header}
        <StatsSkeleton />
      </>
    );
  }

  const { summary, books, stats, vocab } = data;
  // 첫 실행(기록 0) — 나무(열매 0)·빈 도장판만. 스티커·모험 길은 기록이 생긴 뒤에.
  const isFirstRun = summary.totalBooksRead === 0 && summary.totalFinishedSessions === 0 && vocab.length === 0;

  return (
    <>
      {header}
      <div className="mt-3 grid gap-6 lg:grid-cols-2 lg:items-start lg:gap-8">
        <div className="space-y-2.5">
          <ReadingTree booksRead={summary.totalBooksRead} />
          {isFirstRun ? (
            <Link
              href={APP_HOME}
              className="flex min-h-[52px] items-center justify-center gap-2 rounded-full bg-haru-coral-soft text-base font-extrabold text-haru-coral-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <span aria-hidden>📚</span>
              책장으로 가기
            </Link>
          ) : (
            <MiniStats
              finishedSessions={summary.totalFinishedSessions}
              perfectScores={summary.totalPerfectScores}
              averageAccuracy={summary.averageAccuracy}
              points={computePoints(summary)}
            />
          )}
        </div>

        <StampBoard thisMonth={summary.thisMonth} activeDays={summary.activeDaysThisMonth} streak={streak} />

        {!isFirstRun ? (
          <>
            <StickerBook stats={summary} />
            <AdventurePath rows={levelRows(books, stats)} current={currentLevel(books, stats)} />
            <RecentQuizzes books={books} stats={stats} />
          </>
        ) : null}
      </div>
    </>
  );
}

/**
 * 최근 퀴즈 결과(웹에만 있던 목록 — 보호자가 책별 점수를 찾아볼 수 있게 맨 아래에 남긴다).
 * 획득한 것만 보여 주는 톤: 점수는 별 개수로, 빨간색 없이.
 */
function RecentQuizzes({
  books,
  stats,
}: {
  books: Book[];
  stats: Record<number, BookProgressStat>;
}) {
  const rows = useMemo(() => {
    const byId = new Map(books.map((b) => [b.id, b]));
    return Object.entries(stats)
      .flatMap(([id, s]) => {
        const book = byId.get(Number(id));
        return book && s.quizScore !== null ? [{ book, score: s.quizScore, at: s.startedAtUnix }] : [];
      })
      .sort((a, b) => b.at - a.at)
      .slice(0, 8);
  }, [books, stats]);
  if (rows.length === 0) return null;

  return (
    <section aria-labelledby="recent-quiz-title" className="space-y-3 lg:col-span-2">
      <h2 id="recent-quiz-title" className="px-1 text-lg font-extrabold tracking-normal text-haru-ink">최근 퀴즈</h2>
      <ul className="grid gap-2 sm:grid-cols-2">
        {rows.map(({ book, score, at }) => (
          <li key={`${book.id}-${at}`}>
            <Link
              href={`/book/${book.id}`}
              className="flex min-h-12 items-center gap-3 rounded-2xl bg-white/90 px-3.5 py-2.5 shadow-[0_3px_8px_rgb(168_111_63/0.08)] transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none"
            >
              <span className="shrink-0 rounded-md bg-haru-paper px-1.5 py-0.5 text-xs font-extrabold text-haru-muted">
                {book.cefr}
              </span>
              <span className="min-w-0 flex-1 truncate font-reading text-sm font-bold text-haru-ink">{book.title}</span>
              <span className="shrink-0 text-sm font-extrabold tabular-nums text-haru-ink">
                <span aria-hidden className="text-haru-star">★ </span>
                {score} / 5
                <span className="sr-only">개 정답</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function StateMessage({
  pose,
  title,
  text,
  action,
}: {
  pose: 'normal' | 'worried';
  title: string;
  text: string;
  action?: React.ReactNode;
}) {
  return (
    <div role="status" className="flex flex-col items-center py-14 text-center">
      <Mascot pose={pose} size={120} />
      <p className="mt-3 text-lg font-extrabold text-haru-ink">{title}</p>
      <p className="mt-1 text-sm font-bold text-haru-muted">{text}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

/** 불러오는 동안 — 나무·도장판 자리(`stats/loading.tsx`와 같은 모양). */
export function StatsSkeleton() {
  return (
    <div aria-hidden className="mt-3 grid gap-6 lg:grid-cols-2 lg:gap-8">
      <div className="space-y-2.5">
        <div className="h-[330px] animate-pulse rounded-[24px] bg-white/60 motion-reduce:animate-none" />
        <div className="grid grid-cols-4 gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-[62px] animate-pulse rounded-[14px] bg-white/60 motion-reduce:animate-none" />
          ))}
        </div>
      </div>
      <div className="h-[420px] animate-pulse rounded-[22px] bg-white/50 motion-reduce:animate-none" />
    </div>
  );
}
