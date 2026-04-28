'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Progress } from '@/components/ui/progress';
import { EmptyState } from '@/components/ui/empty-state';
import { apiFetch } from '@/lib/api-client';
import type {
  BookProgressStat,
  LearningSummary as Summary,
  VocabEntry,
} from '@/lib/db/queries';
import type { Book, CefrLevel } from '@/lib/db/schema';
import { isUnknown, loadStore, type SrsStore } from '@/lib/srs';
import { useProfileStore } from '@/stores/profile';

const CEFR_ORDER: CefrLevel[] = ['A1', 'A2', 'B1', 'B2'];

const CEFR_CLASS: Record<CefrLevel, string> = {
  A1: 'bg-[color:var(--level-a1)] text-[color:var(--level-a1-fg)]',
  A2: 'bg-[color:var(--level-a2)] text-[color:var(--level-a2-fg)]',
  B1: 'bg-[color:var(--level-b1)] text-[color:var(--level-b1-fg)]',
  B2: 'bg-[color:var(--level-b2)] text-[color:var(--level-b2-fg)]',
};

const CEFR_BAR_BG: Record<CefrLevel, string> = {
  A1: 'bg-[color:var(--level-a1)]',
  A2: 'bg-[color:var(--level-a2)]',
  B1: 'bg-[color:var(--level-b1)]',
  B2: 'bg-[color:var(--level-b2)]',
};

/**
 * 학습 통계 대시보드.
 *
 * 기존 API 3개를 조합해 단일 페이지에서 성취를 한눈에 보게 한다:
 *  - /api/learning-summary (누적 지표 + 월 흔적)
 *  - /api/books            (책 목록 + 진도 stats)
 *  - /api/vocab            (어휘 목록, SRS는 localStorage)
 *
 * 부모·아이 공용 요약 뷰. 보호자 전용 리포트(/parents)와는 성격이 다르다.
 */
export function StatsDashboard() {
  const hasHydrated = useProfileStore((s) => s.hasHydrated);
  const profileId = useProfileStore((s) => s.currentProfileId);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [books, setBooks] = useState<Book[]>([]);
  const [stats, setStats] = useState<Record<number, BookProgressStat>>({});
  const [vocab, setVocab] = useState<VocabEntry[]>([]);
  const [srs, setSrs] = useState<SrsStore>({});
  // 초기값 true: persist hydration 전 EmptyState 깜빡임 방지.
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!hasHydrated) return;
    if (!profileId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    Promise.all([
      apiFetch<{ summary: Summary }>(
        `/api/learning-summary?profileId=${profileId}`,
      ),
      apiFetch<{
        books: Book[];
        stats: Record<number, BookProgressStat>;
      }>(`/api/books?profileId=${profileId}`),
      apiFetch<{ entries: VocabEntry[] }>(`/api/vocab?profileId=${profileId}`),
    ])
      .then(([a, b, c]) => {
        setSummary(a.summary);
        setBooks(b.books);
        setStats(b.stats ?? {});
        setVocab(c.entries);
      })
      .catch((err) => toast.error(`통계 로드 실패: ${err.message}`))
      .finally(() => setLoading(false));
    setSrs(loadStore(profileId));
  }, [hasHydrated, profileId]);

  // 레벨별 책 수 + 평균 정답률
  const levelStats = useMemo(() => {
    const out: Record<
      CefrLevel,
      { count: number; finished: number; avg: number | null }
    > = {
      A1: { count: 0, finished: 0, avg: null },
      A2: { count: 0, finished: 0, avg: null },
      B1: { count: 0, finished: 0, avg: null },
      B2: { count: 0, finished: 0, avg: null },
    };
    const scoreAcc: Record<CefrLevel, number[]> = {
      A1: [],
      A2: [],
      B1: [],
      B2: [],
    };
    for (const b of books) {
      const lvl = b.cefr;
      out[lvl].count += 1;
      const s = stats[b.id];
      if (s) {
        if (s.finishedAtUnix !== null) out[lvl].finished += 1;
        if (s.quizScore !== null) scoreAcc[lvl].push(s.quizScore / 5);
      }
    }
    for (const lvl of CEFR_ORDER) {
      const list = scoreAcc[lvl];
      if (list.length > 0) {
        out[lvl].avg = list.reduce((a, v) => a + v, 0) / list.length;
      }
    }
    return out;
  }, [books, stats]);

  const maxLevelCount = Math.max(1, ...CEFR_ORDER.map((l) => levelStats[l].count));

  // 최근 퀴즈 결과 TOP 8 — startedAtUnix 내림차순
  const recentQuizzes = useMemo(() => {
    type Row = {
      bookId: number;
      title: string;
      cefr: CefrLevel;
      score: number;
      at: number;
    };
    const titleMap = new Map(books.map((b) => [b.id, b]));
    const rows: Row[] = [];
    for (const [idStr, s] of Object.entries(stats)) {
      const id = Number(idStr);
      const b = titleMap.get(id);
      if (!b || s.quizScore === null) continue;
      rows.push({
        bookId: id,
        title: b.title,
        cefr: b.cefr,
        score: s.quizScore,
        at: s.startedAtUnix,
      });
    }
    rows.sort((a, b) => b.at - a.at);
    return rows.slice(0, 8);
  }, [books, stats]);

  // 단어장 SRS 현황
  const vocabBreakdown = useMemo(() => {
    const seen = new Set<string>();
    const unique: VocabEntry[] = [];
    for (const e of vocab) {
      const k = e.word.toLowerCase();
      if (seen.has(k)) continue;
      seen.add(k);
      unique.push(e);
    }
    let unknown = 0;
    let mastering = 0;
    let fresh = 0;
    for (const e of unique) {
      const item = srs[e.word.trim().toLowerCase().replace(/[.,!?;:"']/g, '')];
      if (!item) {
        fresh += 1;
        continue;
      }
      if (item.level === 0 && item.lastGradedAt > 0) {
        unknown += 1;
      } else {
        mastering += 1;
      }
    }
    // 별도 호출: isUnknown을 쓸 수도 있지만 fresh 구분이 필요해서 직접 계산.
    void isUnknown; // 사용처 유지(향후 확장 대비)
    return {
      total: unique.length,
      unknown,
      mastering,
      fresh,
    };
  }, [vocab, srs]);

  // hydration 전·summary 도착 전에는 무조건 Skeleton 우선.
  if (!hasHydrated || (loading && !summary)) {
    return <Skeleton />;
  }
  if (!profileId) {
    return (
      <EmptyState title="누가 볼 거예요?" text="먼저 프로필을 선택해 주세요." />
    );
  }

  return (
    <div className="space-y-8">
      {/* 누적 지표 */}
      <section>
        <h2 className="mb-3 text-lg font-bold tracking-tight">누적 성취</h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
          <BigStat
            label="읽은 책"
            value={summary?.totalBooksRead ?? 0}
            unit="권"
          />
          <BigStat
            label="완독 세션"
            value={summary?.totalFinishedSessions ?? 0}
            unit="회"
          />
          <BigStat
            label="만점"
            value={summary?.totalPerfectScores ?? 0}
            unit="회"
          />
          <BigStat
            label="평균 정답률"
            value={
              summary?.averageAccuracy !== null && summary?.averageAccuracy !== undefined
                ? Math.round(summary.averageAccuracy * 100)
                : 0
            }
            unit="%"
          />
        </div>
      </section>

      {/* 레벨별 분포 */}
      <section>
        <h2 className="mb-3 text-lg font-bold tracking-tight">
          레벨별 독서량
        </h2>
        <div className="space-y-2 rounded-2xl border border-border bg-card p-4 shadow-sm">
          {CEFR_ORDER.map((lvl) => {
            const row = levelStats[lvl];
            const widthPct = (row.count / maxLevelCount) * 100;
            return (
              <div key={lvl} className="flex items-center gap-3">
                <span
                  className={`${CEFR_CLASS[lvl]} inline-flex h-6 w-9 shrink-0 items-center justify-center rounded-md text-xs font-bold`}
                >
                  {lvl}
                </span>
                <div className="relative h-6 flex-1 overflow-hidden rounded-md bg-muted">
                  <div
                    className={`${CEFR_BAR_BG[lvl]} h-full rounded-md transition-all`}
                    style={{ width: `${widthPct}%` }}
                    aria-hidden
                  />
                </div>
                <span className="w-36 shrink-0 whitespace-nowrap text-right text-xs text-muted-foreground tabular-nums sm:w-40">
                  {row.count}권 · 완독 {row.finished}
                  {row.avg !== null ? ` · ${Math.round(row.avg * 100)}%` : ''}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {/* 단어장 현황 */}
      <section>
        <h2 className="mb-3 text-lg font-bold tracking-tight">단어장</h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
          <BigStat
            label="누적"
            value={vocabBreakdown.total}
            unit="개"
          />
          <BigStat
            label="아직 안 본 단어"
            value={vocabBreakdown.fresh}
            unit="개"
          />
          <BigStat
            label="모르는 단어"
            value={vocabBreakdown.unknown}
            unit="개"
            highlight="destructive"
          />
          <BigStat
            label="학습 중"
            value={vocabBreakdown.mastering}
            unit="개"
            highlight="good"
          />
        </div>
      </section>

      {/* 최근 퀴즈 */}
      <section>
        <h2 className="mb-3 text-lg font-bold tracking-tight">
          최근 퀴즈 결과
        </h2>
        {recentQuizzes.length === 0 ? (
          <EmptyState
            title="아직 풀어본 퀴즈가 없어요"
            text="책을 다 읽으면 4지선다 5문제가 기다려요."
          />
        ) : (
          <ul className="space-y-2">
            {recentQuizzes.map((q) => {
              const pct = (q.score / 5) * 100;
              const isPerfect = q.score === 5;
              return (
                <li
                  key={`${q.bookId}-${q.at}`}
                  className="flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-2 shadow-sm"
                >
                  <span
                    className={`${CEFR_CLASS[q.cefr]} inline-flex h-6 w-9 shrink-0 items-center justify-center rounded-md text-xs font-bold`}
                  >
                    {q.cefr}
                  </span>
                  <span className="min-w-0 flex-1 text-sm font-medium">
                    {q.title}
                  </span>
                  <div className="hidden w-24 sm:block">
                    <Progress value={pct} className="h-1.5 rounded-full" />
                  </div>
                  <span
                    className={`w-12 shrink-0 text-right text-sm font-bold tabular-nums ${
                      isPerfect
                        ? 'text-[color:var(--level-a1-fg)]'
                        : pct >= 60
                          ? 'text-foreground'
                          : 'text-[color:var(--destructive)]'
                    }`}
                  >
                    {q.score}/5
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

function BigStat({
  label,
  value,
  unit,
  highlight,
}: {
  label: string;
  value: number;
  unit: string;
  highlight?: 'destructive' | 'good';
}) {
  const toneClass =
    highlight === 'destructive'
      ? 'text-[color:var(--destructive)]'
      : highlight === 'good'
        ? 'text-[color:var(--level-a1-fg)]'
        : 'text-foreground';
  return (
    <div className="rounded-xl border border-border bg-card px-3 py-3 shadow-sm">
      <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        {label}
      </div>
      <div className={`mt-1 text-2xl font-bold tabular-nums ${toneClass}`}>
        {value}
        <span className="ml-0.5 text-sm font-medium text-muted-foreground">
          {unit}
        </span>
      </div>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="shimmer h-20 rounded-xl" />
        ))}
      </div>
      <div className="shimmer h-40 rounded-2xl" />
      <div className="shimmer h-24 rounded-2xl" />
    </div>
  );
}
