import { and, count, desc, eq, gte, isNull, lt } from 'drizzle-orm';
import { db } from '../index';
import { books, readingLogs, vocabProgress } from '../schema';
import { toYMD } from './_shared';

// ===== Learning summary =====

export interface LearningSummary {
  totalBooksRead: number;
  totalFinishedSessions: number;
  totalPerfectScores: number;
  /** 마스터한 단어 수 (vocab_progress.level >= 3) — 포인트·배지 파생 집계용. */
  masteredWords: number;
  averageAccuracy: number | null;
  lastFinishedAtUnix: number | null;
  continueBookId: number | null;
  activeDaysThisWeek: string[];
  activeDaysThisMonth: string[];
  thisMonth: string;
}

export async function getLearningSummary(
  profileId: number,
): Promise<LearningSummary> {
  // 독서 로그와 마스터 단어 수는 서로 독립 — 병렬 조회.
  const [rows, masteredRows] = await Promise.all([
    db
      .select()
      .from(readingLogs)
      .where(eq(readingLogs.profileId, profileId))
      .orderBy(desc(readingLogs.startedAt)),
    db
      .select({ n: count() })
      .from(vocabProgress)
      .where(
        // 3 = srs.ts MAX_LEVEL(마스터 기준). srs.ts가 'use client' 모듈이라 직접
        // import 불가 — 값 변경 시 양쪽을 함께 수정할 것.
        and(eq(vocabProgress.profileId, profileId), gte(vocabProgress.level, 3)),
      ),
  ]);

  const finishedRows = rows.filter((r) => r.finishedAt !== null);
  const scoredRows = finishedRows.filter(
    (r): r is typeof r & { quizScore: number } => r.quizScore !== null,
  );

  const distinctBooks = new Set(finishedRows.map((r) => r.bookId));
  const totalPerfect = scoredRows.filter((r) => r.quizScore === 5).length;
  const avg =
    scoredRows.length > 0
      ? scoredRows.reduce((acc, r) => acc + r.quizScore / 5, 0) /
        scoredRows.length
      : null;

  const lastFinished = finishedRows[0]?.finishedAt ?? null;
  const inProgress = rows.find((r) => r.finishedAt === null);

  const weekAgoMs = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const weekAgoDate = new Date(weekAgoMs);
  const activeDaysWeek = new Set<string>();
  for (const r of rows) {
    const ts = r.finishedAt ?? r.startedAt;
    if (ts >= weekAgoDate) activeDaysWeek.add(toYMD(ts));
  }
  const recentBooks = await db
    .select({ createdAt: books.createdAt })
    .from(books)
    .where(
      and(
        eq(books.profileId, profileId),
        isNull(books.deletedAt),
        gte(books.createdAt, weekAgoDate),
      ),
    );
  for (const b of recentBooks) activeDaysWeek.add(toYMD(b.createdAt));

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEndExclusive = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const activeDaysMonth = new Set<string>();
  for (const r of rows) {
    const ts = r.finishedAt ?? r.startedAt;
    if (ts >= monthStart && ts < monthEndExclusive) {
      activeDaysMonth.add(toYMD(ts));
    }
  }
  const monthBooks = await db
    .select({ createdAt: books.createdAt })
    .from(books)
    .where(
      and(
        eq(books.profileId, profileId),
        isNull(books.deletedAt),
        gte(books.createdAt, monthStart),
        lt(books.createdAt, monthEndExclusive),
      ),
    );
  for (const b of monthBooks) activeDaysMonth.add(toYMD(b.createdAt));

  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  return {
    totalBooksRead: distinctBooks.size,
    totalFinishedSessions: finishedRows.length,
    totalPerfectScores: totalPerfect,
    masteredWords: masteredRows[0]?.n ?? 0,
    averageAccuracy: avg,
    lastFinishedAtUnix: lastFinished
      ? Math.floor(lastFinished.getTime() / 1000)
      : null,
    continueBookId: inProgress?.bookId ?? null,
    activeDaysThisWeek: Array.from(activeDaysWeek).sort(),
    activeDaysThisMonth: Array.from(activeDaysMonth).sort(),
    thisMonth,
  };
}
