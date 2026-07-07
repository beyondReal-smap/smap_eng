import { and, asc, desc, eq, gte, isNull } from 'drizzle-orm';
import { db } from '../index';
import { books, profiles, readingLogs, type ReadingLog } from '../schema';
import { toYMD } from './_shared';
import { listFlaggedBooksByProfile } from './books';

// ===== Parental report =====

export interface ParentalProfileReport {
  profileId: number;
  name: string;
  avatar: string | null;
  booksCreatedWeek: number;
  sessionsFinishedWeek: number;
  averageAccuracyWeek: number | null;
  totalBooks: number;
  totalPerfect: number;
  /** 최근 7일 동안 활동한 날짜 목록(YYYY-MM-DD). */
  activeDays: string[];
  /** 신고(flagged)된 책 — 보호자 검토 대상. */
  flaggedBooks: Array<{
    id: number;
    title: string;
    reason: string | null;
    flaggedAt: string;
  }>;
}

/// 주간 리포트 푸시 발송 대상 — 자식 프로필이 1개 이상이고 push 토큰이 등록된 user.
/// notify-weekly 라우트가 이 목록을 순회하며 보호자에게 알림을 보낸다.
export async function listUserIdsForWeeklyNotify(): Promise<string[]> {
  const rows = await db
    .selectDistinct({ userId: profiles.userId })
    .from(profiles);
  return rows.map((r) => r.userId);
}

// 가족(user) 단위 보호자 리포트 — 해당 user의 모든 자녀 프로필 집계.
export async function getParentalReport(
  userId: string,
): Promise<ParentalProfileReport[]> {
  const now = Date.now();
  const weekAgoMs = now - 7 * 24 * 60 * 60 * 1000;
  const weekAgoDate = new Date(weekAgoMs);

  const profs = await db
    .select()
    .from(profiles)
    .where(eq(profiles.userId, userId))
    .orderBy(asc(profiles.createdAt));

  const reports: ParentalProfileReport[] = [];
  for (const p of profs) {
    const booksThisWeek = await db
      .select()
      .from(books)
      .where(
        and(
          eq(books.profileId, p.id),
          isNull(books.deletedAt),
          gte(books.createdAt, weekAgoDate),
        ),
      );

    const allLogs = await db
      .select()
      .from(readingLogs)
      .where(eq(readingLogs.profileId, p.id));

    const finishedThisWeek = allLogs.filter(
      (l) => l.finishedAt !== null && l.finishedAt >= weekAgoDate,
    );
    const scoredWeek = finishedThisWeek.filter(
      (l): l is typeof l & { quizScore: number } => l.quizScore !== null,
    );
    const avgWeek =
      scoredWeek.length > 0
        ? scoredWeek.reduce((acc, l) => acc + l.quizScore / 5, 0) /
          scoredWeek.length
        : null;

    const finishedAll = allLogs.filter((l) => l.finishedAt !== null);
    const distinctBooks = new Set(finishedAll.map((l) => l.bookId));
    const totalPerfect = finishedAll.filter((l) => l.quizScore === 5).length;

    const days = new Set<string>();
    for (const l of allLogs) {
      const ts = l.finishedAt ?? l.startedAt;
      if (ts >= weekAgoDate) days.add(toYMD(ts));
    }
    for (const b of booksThisWeek) {
      days.add(toYMD(b.createdAt));
    }

    const flagged = (await listFlaggedBooksByProfile(p.id)).map((b) => ({
      id: b.id,
      title: b.title,
      reason: b.flaggedReason,
      flaggedAt: (b.flaggedAt ?? new Date()).toISOString(),
    }));

    reports.push({
      profileId: p.id,
      name: p.name,
      avatar: p.avatar,
      booksCreatedWeek: booksThisWeek.length,
      sessionsFinishedWeek: finishedThisWeek.length,
      averageAccuracyWeek: avgWeek,
      totalBooks: distinctBooks.size,
      totalPerfect,
      activeDays: Array.from(days).sort(),
      flaggedBooks: flagged,
    });
  }
  return reports;
}

export interface BookProgressStat {
  progressRatio: number;
  quizScore: number | null;
  /** epoch seconds. null이면 아직 완료 전. */
  finishedAtUnix: number | null;
  startedAtUnix: number;
}

/**
 * 프로필의 각 책별 "최신" reading_log를 Map으로 반환.
 * 재독이 있어도 가장 최근 세션 1건만 사용.
 */
export async function getBookProgressMap(
  profileId: number,
): Promise<Record<number, BookProgressStat>> {
  const logs = await db
    .select()
    .from(readingLogs)
    .where(eq(readingLogs.profileId, profileId))
    .orderBy(desc(readingLogs.startedAt));
  const out: Record<number, BookProgressStat> = {};
  for (const l of logs) {
    if (out[l.bookId]) continue;
    out[l.bookId] = {
      progressRatio: l.progressRatio,
      quizScore: l.quizScore,
      finishedAtUnix: l.finishedAt
        ? Math.floor(l.finishedAt.getTime() / 1000)
        : null,
      startedAtUnix: Math.floor(l.startedAt.getTime() / 1000),
    };
  }
  return out;
}

export async function listLogsByProfile(
  profileId: number,
): Promise<ReadingLog[]> {
  return db
    .select()
    .from(readingLogs)
    .where(eq(readingLogs.profileId, profileId))
    .orderBy(desc(readingLogs.startedAt));
}
