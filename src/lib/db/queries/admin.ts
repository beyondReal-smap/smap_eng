import {
  and,
  count,
  desc,
  eq,
  gte,
  isNotNull,
  isNull,
  lt,
  sql,
  sum,
} from 'drizzle-orm';
import { db } from '../index';
import {
  books,
  creditBalances,
  creditTransactions,
  profiles,
  subscriptions,
  users,
  type Book,
  type CefrLevel,
  type CreditTransaction,
  type UserRole,
} from '../schema';
import { getBookById } from './books';

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
