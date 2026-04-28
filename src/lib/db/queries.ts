import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  isNotNull,
  isNull,
  like,
  lt,
  or,
  sql,
  sum,
} from 'drizzle-orm';
import { db } from './index';
import {
  books,
  creditBalances,
  creditTransactions,
  passages,
  profiles,
  quizzes,
  readingLogs,
  subscriptions,
  users,
  type Book,
  type CefrLevel,
  type CreditTransaction,
  type NewBook,
  type NewPassage,
  type NewProfile,
  type NewQuiz,
  type NewReadingLog,
  type Passage,
  type Profile,
  type Quiz,
  type ReadingLog,
  type UserRole,
  type VocabularyEntry,
} from './schema';

function parseJsonColumn<T>(
  fieldName: string,
  value: T | string | null,
): T | null {
  if (value === null) return null;
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value) as T;
  } catch (cause) {
    throw new Error(`Invalid JSON in ${fieldName}`, { cause });
  }
}

function normalizeBookJsonFields(row: Book): Book {
  return {
    ...row,
    vocabulary: parseJsonColumn<NonNullable<Book['vocabulary']>>(
      'books.vocabulary',
      row.vocabulary,
    ),
    alternateEnding: parseJsonColumn<NonNullable<Book['alternateEnding']>>(
      'books.alternateEnding',
      row.alternateEnding,
    ),
    funFacts: parseJsonColumn<NonNullable<Book['funFacts']>>(
      'books.funFacts',
      row.funFacts,
    ),
    intake: parseJsonColumn<NonNullable<Book['intake']>>(
      'books.intake',
      row.intake,
    ),
  };
}

function normalizeQuizJsonFields(row: Quiz): Quiz {
  const choices = parseJsonColumn<Quiz['choices']>(
    'quizzes.choices',
    row.choices,
  );
  if (choices === null) {
    throw new Error(`Invalid JSON in quizzes.choices`);
  }
  return { ...row, choices };
}

// ===== Profiles =====

// 특정 user(부모 계정)의 자녀 프로필 목록 — users(1) ↔ profiles(N).
export async function listProfiles(userId: string): Promise<Profile[]> {
  return db
    .select()
    .from(profiles)
    .where(eq(profiles.userId, userId))
    .orderBy(asc(profiles.createdAt));
}

export async function createProfile(data: NewProfile): Promise<Profile> {
  const [{ id }] = await db.insert(profiles).values(data).$returningId();
  const [row] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.id, id))
    .limit(1);
  if (!row) throw new Error('Inserted profile not found');
  return row;
}

// ===== Books =====

export interface BookFilter {
  profileId: number;
  age?: number;
  cefr?: CefrLevel;
  /** 제목·주제 부분 일치. utf8mb4_unicode_ci 콜레이션으로 기본 case-insensitive. */
  q?: string;
}

export async function listBooks(filter: BookFilter): Promise<Book[]> {
  const conditions = [
    eq(books.profileId, filter.profileId),
    isNull(books.deletedAt),
    isNull(books.flaggedAt),
  ];
  if (filter.age !== undefined) conditions.push(eq(books.age, filter.age));
  if (filter.cefr !== undefined) conditions.push(eq(books.cefr, filter.cefr));
  if (filter.q) {
    const needle = `%${filter.q.trim()}%`;
    conditions.push(or(like(books.title, needle), like(books.topic, needle))!);
  }
  const rows = await db
    .select()
    .from(books)
    .where(and(...conditions))
    .orderBy(desc(books.createdAt));
  return rows.map(normalizeBookJsonFields);
}

/** 단건 조회 — soft-deleted도 포함(복원/감사 용도). 책장 UI는 listBooks 사용. */
export async function getBookById(id: number): Promise<Book | undefined> {
  const [row] = await db.select().from(books).where(eq(books.id, id)).limit(1);
  return row ? normalizeBookJsonFields(row) : undefined;
}

export async function updateBook(
  id: number,
  patch: Partial<Pick<Book, 'title' | 'topic' | 'coverImagePath'>>,
): Promise<Book | undefined> {
  await db.update(books).set(patch).where(eq(books.id, id));
  return getBookById(id);
}

export async function softDeleteBook(id: number): Promise<Book | undefined> {
  await db
    .update(books)
    .set({ deletedAt: new Date() })
    .where(eq(books.id, id));
  return getBookById(id);
}

export async function flagBook(
  id: number,
  reason: string,
): Promise<Book | undefined> {
  // flagged_reason 컬럼이 varchar(500)이므로 상한에 맞춰 절삭.
  // API 경계(Zod max 500) 외 내부 호출도 방어.
  await db
    .update(books)
    .set({ flaggedAt: new Date(), flaggedReason: reason.slice(0, 500) })
    .where(eq(books.id, id));
  return getBookById(id);
}

export async function unflagBook(id: number): Promise<Book | undefined> {
  await db
    .update(books)
    .set({ flaggedAt: null, flaggedReason: null })
    .where(eq(books.id, id));
  return getBookById(id);
}

export async function listFlaggedBooksByProfile(
  profileId: number,
): Promise<Book[]> {
  const rows = await db
    .select()
    .from(books)
    .where(
      and(
        eq(books.profileId, profileId),
        isNull(books.deletedAt),
        isNotNull(books.flaggedAt),
      ),
    )
    .orderBy(desc(books.flaggedAt));
  return rows.map(normalizeBookJsonFields);
}

/** 동화 1편을 트랜잭션으로 books + passages 동시 삽입. */
export async function insertBookWithPassages(
  book: NewBook,
  passageRows: Omit<NewPassage, 'bookId'>[],
): Promise<Book> {
  return db.transaction(async (tx) => {
    const [{ id }] = await tx.insert(books).values(book).$returningId();
    if (passageRows.length > 0) {
      await tx
        .insert(passages)
        .values(passageRows.map((p) => ({ ...p, bookId: id })));
    }
    const [row] = await tx
      .select()
      .from(books)
      .where(eq(books.id, id))
      .limit(1);
    if (!row) throw new Error('Inserted book not found');
    return normalizeBookJsonFields(row);
  });
}

export interface VocabEntry {
  word: string;
  meaning: string;
  bookId: number;
  bookTitle: string;
}

export async function listVocabularyByProfile(
  profileId: number,
): Promise<VocabEntry[]> {
  const rows = await db
    .select({
      id: books.id,
      title: books.title,
      vocabulary: books.vocabulary,
      createdAt: books.createdAt,
    })
    .from(books)
    .where(and(eq(books.profileId, profileId), isNull(books.deletedAt)))
    .orderBy(desc(books.createdAt));

  const out: VocabEntry[] = [];
  for (const r of rows) {
    // mysql2 typeCast가 우회돼 vocabulary가 string으로 도착하는 사고가 있어
    // (2026-04-26) 서버에서도 한 번 더 정규화한다. 이미 array면 그대로
    // 통과하고, string이면 JSON.parse, 실패 시 에러를 표면화한다.
    const vocab = parseJsonColumn<VocabularyEntry[]>(
      'books.vocabulary',
      r.vocabulary,
    );
    if (!vocab || !Array.isArray(vocab)) continue;
    for (const v of vocab) {
      if (!v?.word || !v?.meaning) continue;
      out.push({
        word: v.word,
        meaning: v.meaning,
        bookId: r.id,
        bookTitle: r.title,
      });
    }
  }
  return out;
}

// ===== Passages =====

export async function listPassagesByBook(bookId: number): Promise<Passage[]> {
  return db
    .select()
    .from(passages)
    .where(eq(passages.bookId, bookId))
    .orderBy(asc(passages.orderIndex));
}

async function getPassageById(
  passageId: number,
): Promise<Passage | undefined> {
  const [row] = await db
    .select()
    .from(passages)
    .where(eq(passages.id, passageId))
    .limit(1);
  return row;
}

export async function updatePassageAudio(
  passageId: number,
  audioPath: string,
): Promise<Passage | undefined> {
  await db
    .update(passages)
    .set({ audioPath })
    .where(eq(passages.id, passageId));
  return getPassageById(passageId);
}

export async function updatePassageImage(
  passageId: number,
  sceneImagePath: string,
): Promise<Passage | undefined> {
  await db
    .update(passages)
    .set({ sceneImagePath })
    .where(eq(passages.id, passageId));
  return getPassageById(passageId);
}

// ===== Quizzes =====

export async function listQuizzesByBook(bookId: number): Promise<Quiz[]> {
  const rows = await db
    .select()
    .from(quizzes)
    .where(eq(quizzes.bookId, bookId))
    .orderBy(asc(quizzes.orderIndex));
  return rows.map(normalizeQuizJsonFields);
}

export async function insertQuizzes(
  bookId: number,
  items: Omit<NewQuiz, 'bookId'>[],
): Promise<void> {
  if (items.length === 0) return;
  await db.insert(quizzes).values(items.map((q) => ({ ...q, bookId })));
}

// ===== Reading logs =====

export async function createReadingLog(
  data: NewReadingLog,
): Promise<ReadingLog> {
  const [{ id }] = await db.insert(readingLogs).values(data).$returningId();
  const [row] = await db
    .select()
    .from(readingLogs)
    .where(eq(readingLogs.id, id))
    .limit(1);
  if (!row) throw new Error('Inserted reading log not found');
  return row;
}

export async function updateReadingLog(
  id: number,
  patch: Partial<Pick<ReadingLog, 'progressRatio' | 'finishedAt' | 'quizScore'>>,
): Promise<ReadingLog | undefined> {
  await db.update(readingLogs).set(patch).where(eq(readingLogs.id, id));
  const [row] = await db
    .select()
    .from(readingLogs)
    .where(eq(readingLogs.id, id))
    .limit(1);
  return row;
}

export async function getReadingLogById(
  id: number,
): Promise<ReadingLog | undefined> {
  const [row] = await db
    .select()
    .from(readingLogs)
    .where(eq(readingLogs.id, id))
    .limit(1);
  return row;
}

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

function toYMD(d: Date): string {
  return d.toISOString().slice(0, 10);
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

// ===== Learning summary =====

export interface LearningSummary {
  totalBooksRead: number;
  totalFinishedSessions: number;
  totalPerfectScores: number;
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
  const rows = await db
    .select()
    .from(readingLogs)
    .where(eq(readingLogs.profileId, profileId))
    .orderBy(desc(readingLogs.startedAt));

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

// ===== Admin =====
// /admin/* 전용 쿼리. 모든 호출부는 requireAdminUser() 통과 후에만 접근해야 한다.

export interface AdminOverviewStats {
  totalUsers: number;
  totalProfiles: number;
  totalBooks: number;          // soft-deleted / flagged 포함 전체
  flaggedBooksCount: number;   // 신고됨 + 삭제되지 않음
  booksCreatedThisMonth: number; // 이번 달(UTC 기준) 생성된 책 수
  activeSubscriptions: number;
  totalCreditBalance: number;
  creditsConsumedThisMonth: number; // 이번 달(UTC 기준) consume 합
  creditsGrantedThisMonth: number;
}

export async function adminGetOverviewStats(
  now: Date = new Date(),
): Promise<AdminOverviewStats> {
  const monthStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
  );
  const nextMonthStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1),
  );

  const [
    [usersRow],
    [profilesRow],
    [booksRow],
    [flaggedRow],
    [booksMonthRow],
    [subscriptionsRow],
    [balanceRow],
    [consumeRow],
    [grantRow],
  ] = await Promise.all([
    db.select({ n: count() }).from(users),
    db.select({ n: count() }).from(profiles),
    db.select({ n: count() }).from(books),
    db
      .select({ n: count() })
      .from(books)
      .where(and(isNotNull(books.flaggedAt), isNull(books.deletedAt))),
    db
      .select({ n: count() })
      .from(books)
      .where(
        and(
          gte(books.createdAt, monthStart),
          lt(books.createdAt, nextMonthStart),
        ),
      ),
    db.select({ n: count() }).from(subscriptions),
    db.select({ s: sum(creditBalances.balance) }).from(creditBalances),
    db
      .select({ s: sum(creditTransactions.delta) })
      .from(creditTransactions)
      .where(
        and(
          eq(creditTransactions.kind, 'consume'),
          gte(creditTransactions.createdAt, monthStart),
          lt(creditTransactions.createdAt, nextMonthStart),
        ),
      ),
    db
      .select({ s: sum(creditTransactions.delta) })
      .from(creditTransactions)
      .where(
        and(
          eq(creditTransactions.kind, 'grant'),
          gte(creditTransactions.createdAt, monthStart),
          lt(creditTransactions.createdAt, nextMonthStart),
        ),
      ),
  ]);

  // consume은 음수 delta로 기록되므로 절댓값으로 표시.
  const consumedRaw = consumeRow?.s;
  const consumed =
    consumedRaw === null || consumedRaw === undefined
      ? 0
      : Math.abs(Number(consumedRaw));

  return {
    totalUsers: Number(usersRow?.n ?? 0),
    totalProfiles: Number(profilesRow?.n ?? 0),
    totalBooks: Number(booksRow?.n ?? 0),
    flaggedBooksCount: Number(flaggedRow?.n ?? 0),
    booksCreatedThisMonth: Number(booksMonthRow?.n ?? 0),
    activeSubscriptions: Number(subscriptionsRow?.n ?? 0),
    totalCreditBalance: Number(balanceRow?.s ?? 0),
    creditsConsumedThisMonth: consumed,
    creditsGrantedThisMonth: Number(grantRow?.s ?? 0),
  };
}

export interface AdminUserRow {
  id: string;
  email: string | null;
  name: string | null;
  role: UserRole;
  createdAt: Date;
  profileCount: number;
}

export async function adminListUsersWithProfileCount(
  q?: string,
): Promise<AdminUserRow[]> {
  const needle = q?.trim();
  // utf8mb4의 기본 collation(_ci)은 case-insensitive지만,
  // 배포 환경에 따라 바뀔 수 있으므로 LOWER() 래핑으로 방어.
  const where = needle
    ? sql`LOWER(${users.email}) LIKE LOWER(${`%${needle}%`})`
    : undefined;
  const rows = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
      createdAt: users.createdAt,
      profileCount: count(profiles.id),
    })
    .from(users)
    .leftJoin(profiles, eq(profiles.userId, users.id))
    .where(where)
    .groupBy(users.id, users.email, users.name, users.role, users.createdAt)
    .orderBy(desc(users.createdAt))
    .limit(200);
  return rows.map((r) => ({
    ...r,
    role: r.role as UserRole,
    profileCount: Number(r.profileCount),
  }));
}

export async function adminUpdateUserRole(
  userId: string,
  role: UserRole,
): Promise<void> {
  await db.update(users).set({ role }).where(eq(users.id, userId));
}

export type AdminBookFilter = 'all' | 'normal' | 'flagged' | 'deleted';

export interface AdminBookRow {
  id: number;
  title: string;
  profileId: number;
  profileName: string | null;
  userId: string;
  userEmail: string | null;
  age: number;
  cefr: CefrLevel;
  createdAt: Date;
  deletedAt: Date | null;
  flaggedAt: Date | null;
  flaggedReason: string | null;
}

export async function adminListAllBooks(
  filter: AdminBookFilter = 'all',
): Promise<AdminBookRow[]> {
  const where = (() => {
    switch (filter) {
      case 'normal':
        return and(isNull(books.deletedAt), isNull(books.flaggedAt));
      case 'flagged':
        return and(isNotNull(books.flaggedAt), isNull(books.deletedAt));
      case 'deleted':
        return isNotNull(books.deletedAt);
      case 'all':
      default:
        return undefined;
    }
  })();
  const rows = await db
    .select({
      id: books.id,
      title: books.title,
      profileId: books.profileId,
      profileName: profiles.name,
      userId: profiles.userId,
      userEmail: users.email,
      age: books.age,
      cefr: books.cefr,
      createdAt: books.createdAt,
      deletedAt: books.deletedAt,
      flaggedAt: books.flaggedAt,
      flaggedReason: books.flaggedReason,
    })
    .from(books)
    .innerJoin(profiles, eq(profiles.id, books.profileId))
    .innerJoin(users, eq(users.id, profiles.userId))
    .where(where)
    .orderBy(desc(books.createdAt))
    .limit(200);
  return rows.map((r) => ({ ...r, cefr: r.cefr as CefrLevel }));
}

export async function adminRestoreBook(id: number): Promise<Book | undefined> {
  await db.update(books).set({ deletedAt: null }).where(eq(books.id, id));
  return getBookById(id);
}

export interface AdminCreditLedgerRow {
  id: number;
  kind: CreditTransaction['kind'];
  delta: number;
  packageId: string | null;
  bookId: number | null;
  createdAt: Date;
}

export interface AdminCreditSummary {
  userId: string;
  email: string | null;
  balance: number;
  totalPurchased: number;
  recentLedger: AdminCreditLedgerRow[];
}

export async function adminGetCreditSummary(
  userId: string,
  limit = 50,
): Promise<AdminCreditSummary | null> {
  const [[userRow], [balanceRow], ledger] = await Promise.all([
    db
      .select({ id: users.id, email: users.email })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1),
    db
      .select()
      .from(creditBalances)
      .where(eq(creditBalances.userId, userId))
      .limit(1),
    db
      .select({
        id: creditTransactions.id,
        kind: creditTransactions.kind,
        delta: creditTransactions.delta,
        packageId: creditTransactions.packageId,
        bookId: creditTransactions.bookId,
        createdAt: creditTransactions.createdAt,
      })
      .from(creditTransactions)
      .where(eq(creditTransactions.userId, userId))
      .orderBy(desc(creditTransactions.createdAt))
      .limit(limit),
  ]);
  if (!userRow) return null;
  return {
    userId: userRow.id,
    email: userRow.email,
    balance: Number(balanceRow?.balance ?? 0),
    totalPurchased: Number(balanceRow?.totalPurchased ?? 0),
    recentLedger: ledger.map((r) => ({
      ...r,
      kind: r.kind as CreditTransaction['kind'],
    })),
  };
}

export interface AdminSubscriptionRow {
  userId: string;
  email: string | null;
  cycleAnchorDay: number;
  createdAt: Date;
  updatedAt: Date;
}

export async function adminListSubscriptions(): Promise<AdminSubscriptionRow[]> {
  return db
    .select({
      userId: subscriptions.userId,
      email: users.email,
      cycleAnchorDay: subscriptions.cycleAnchorDay,
      createdAt: subscriptions.createdAt,
      updatedAt: subscriptions.updatedAt,
    })
    .from(subscriptions)
    .innerJoin(users, eq(users.id, subscriptions.userId))
    .orderBy(desc(subscriptions.createdAt))
    .limit(500);
}

// 지정 userId로 users 레코드 검증 (credits grant 전에 존재 체크용).
export async function adminFindUserById(
  userId: string,
): Promise<{ id: string; email: string | null } | undefined> {
  const [row] = await db
    .select({ id: users.id, email: users.email })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return row;
}

// sql helper는 credits.ts에서 사용되므로 re-export 불필요. 위의 sum/sql import 활용.
export { sql };
