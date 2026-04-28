import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { and, eq } from 'drizzle-orm';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import {
  books,
  mobileAuthTokens,
  passages,
  profiles,
} from '@/lib/db/schema';
import { createHash } from 'node:crypto';

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

async function getBearerToken(): Promise<string | null> {
  const authorization = (await headers()).get('authorization');
  if (!authorization?.startsWith('Bearer ')) return null;
  const token = authorization.slice('Bearer '.length).trim();
  return token.length > 0 ? token : null;
}

async function getMobileUserIdFromBearer(): Promise<string | null> {
  const token = await getBearerToken();
  if (!token) return null;

  const now = new Date();
  const [row] = await db
    .select()
    .from(mobileAuthTokens)
    .where(
      and(
        eq(mobileAuthTokens.tokenHash, sha256(token)),
        eq(mobileAuthTokens.kind, 'access_token'),
      ),
    )
    .limit(1);

  if (
    !row ||
    row.expiresAt <= now ||
    row.revokedAt !== null ||
    row.consumedAt !== null
  ) {
    return null;
  }

  await db
    .update(mobileAuthTokens)
    .set({ lastUsedAt: now })
    .where(eq(mobileAuthTokens.id, row.id));

  return row.userId;
}

/**
 * 서버 컨텍스트(Server Component / Route Handler / Server Action)에서
 * 현재 로그인 유저를 가져온다. 비로그인 시 null 반환.
 */
export async function getCurrentUserId(): Promise<string | null> {
  const mobileUserId = await getMobileUserIdFromBearer();
  if (mobileUserId) return mobileUserId;

  const session = await auth();
  return session?.user?.id ?? null;
}

/**
 * 로그인 필수 — 미로그인 시 /login으로 302.
 * 반환값은 users.id (varchar(255)).
 *
 * Server Component / Server Action 전용. API Route Handler에서는
 * `requireUserIdForApi()`를 사용해 JSON 401을 반환해야 한다 — fetch
 * 호출자가 307 리다이렉트를 따라가면 HTML(/login) 응답을 받아 에러
 * 처리 분기가 깨진다.
 */
export async function requireUserId(): Promise<string> {
  const id = await getCurrentUserId();
  if (!id) redirect('/login');
  return id;
}

/**
 * API Route Handler 전용 — 미인증 시 redirect 대신 ApiAuthError(401) throw.
 * `handleApiError`에서 401 JSON 응답으로 변환된다.
 */
export async function requireUserIdForApi(): Promise<string> {
  const id = await getCurrentUserId();
  if (!id) throw new ApiAuthError('unauthorized', 401);
  return id;
}

// 401: 미인증, 404: 자원이 존재하지 않거나 소유권이 없음(OWASP API1 BOLA 방어 — 존재 노출 회피).
// 403은 어드민 권한 부족에만 사용 (AdminAuthError).
export class ApiAuthError extends Error {
  constructor(
    message: 'unauthorized' | 'not_found',
    public status: 401 | 404,
  ) {
    super(message);
    this.name = 'ApiAuthError';
  }
}

/**
 * 서버 컴포넌트(Page) 전용 — 책 소유권 검증.
 * 미로그인 → /login으로 redirect. 비존재/비소유 → null 반환(호출 측에서 notFound() 처리).
 *
 * Route Handler에서는 `requireBookOwnershipForApi`를 사용한다.
 */
export async function getOwnedBookForPage(
  bookId: number,
): Promise<{ ownerId: string; profileId: number } | null> {
  if (!Number.isInteger(bookId) || bookId <= 0) return null;
  const userId = await requireUserId();
  const [row] = await db
    .select({
      profileId: books.profileId,
      ownerId: profiles.userId,
    })
    .from(books)
    .innerJoin(profiles, eq(books.profileId, profiles.id))
    .where(eq(books.id, bookId))
    .limit(1);
  if (!row || row.ownerId !== userId) return null;
  return row;
}

/**
 * profileId가 현재 로그인 user 소유인지 검증.
 * 미인증 → 401. 비존재/비소유 → 404 (BOLA enumeration 방지).
 */
export async function requireProfileOwnershipForApi(
  profileId: number,
): Promise<{ userId: string }> {
  const userId = await requireUserIdForApi();
  if (!Number.isInteger(profileId) || profileId <= 0) {
    throw new ApiAuthError('not_found', 404);
  }
  const [row] = await db
    .select({ userId: profiles.userId })
    .from(profiles)
    .where(eq(profiles.id, profileId))
    .limit(1);
  if (!row || row.userId !== userId) {
    throw new ApiAuthError('not_found', 404);
  }
  return { userId };
}

/**
 * bookId가 현재 로그인 user 소유의 프로필에 속하는지 검증.
 * soft-delete된 책(deletedAt)도 일단 허용 — 라우트별로 추가 분기 가능.
 */
export async function requireBookOwnershipForApi(
  bookId: number,
): Promise<{ userId: string; profileId: number }> {
  const userId = await requireUserIdForApi();
  if (!Number.isInteger(bookId) || bookId <= 0) {
    throw new ApiAuthError('not_found', 404);
  }
  const [row] = await db
    .select({
      profileId: books.profileId,
      ownerId: profiles.userId,
    })
    .from(books)
    .innerJoin(profiles, eq(books.profileId, profiles.id))
    .where(eq(books.id, bookId))
    .limit(1);
  if (!row || row.ownerId !== userId) {
    throw new ApiAuthError('not_found', 404);
  }
  return { userId, profileId: row.profileId };
}

/**
 * passageId가 현재 로그인 user 소유의 책에 속하는지 검증.
 */
export async function requirePassageOwnershipForApi(
  passageId: number,
): Promise<{ userId: string; bookId: number; profileId: number }> {
  const userId = await requireUserIdForApi();
  if (!Number.isInteger(passageId) || passageId <= 0) {
    throw new ApiAuthError('not_found', 404);
  }
  const [row] = await db
    .select({
      bookId: passages.bookId,
      profileId: books.profileId,
      ownerId: profiles.userId,
    })
    .from(passages)
    .innerJoin(books, eq(passages.bookId, books.id))
    .innerJoin(profiles, eq(books.profileId, profiles.id))
    .where(eq(passages.id, passageId))
    .limit(1);
  if (!row || row.ownerId !== userId) {
    throw new ApiAuthError('not_found', 404);
  }
  return { userId, bookId: row.bookId, profileId: row.profileId };
}

/** 전체 user 객체가 필요할 때 사용. */
export async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');
  return session.user;
}

/**
 * 어드민 전용 — /admin/* 페이지·API에서 1번째 호출로 사용.
 * 미로그인 → /login 302. 로그인했으나 비어드민 → / 302 (정보 노출 최소화).
 */
export async function requireAdminUser(): Promise<{
  id: string;
  email: string | null | undefined;
  role: 'admin';
}> {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');
  if (session.user.role !== 'admin') redirect('/');
  return {
    id: session.user.id,
    email: session.user.email,
    role: 'admin',
  };
}

/**
 * API Route Handler용 어드민 가드 — redirect 대신 throw로 응답 반환을 강제.
 * 라우트에서 `await assertAdminApi()` 후 `handleApiError(err)` 경로로 403 자동 반환.
 */
export async function assertAdminApi(): Promise<{ id: string; role: 'admin' }> {
  const session = await auth();
  if (!session?.user?.id) throw new AdminAuthError('unauthorized', 401);
  if (session.user.role !== 'admin') throw new AdminAuthError('forbidden', 403);
  return { id: session.user.id, role: 'admin' };
}

export class AdminAuthError extends Error {
  constructor(
    message: 'unauthorized' | 'forbidden',
    public status: 401 | 403,
  ) {
    super(message);
    this.name = 'AdminAuthError';
  }
}
