import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import {
  BookGenreSchema,
  generateIntakeQuestions,
  type IntakeQuestions,
} from '@/lib/llm';
import { db } from '@/lib/db';
import { CEFR_LEVELS, profiles } from '@/lib/db/schema';
import { requireProfileOwnershipForApi, ApiAuthError } from '@/lib/auth/session';
import { handleApiError } from '../../../_lib/errors';

export const runtime = 'nodejs';

const RequestSchema = z.object({
  profileId: z.number().int().positive(),
  genre: BookGenreSchema,
  cefr: z.enum(CEFR_LEVELS),
});

// 메모리 기반 rate limit — 분당 10회/유저. 인스턴스 재시작 시 리셋되지만,
// 본 라우트는 별 차감이 없고 LLM 호출 비용 절감이 목적이라 충분.
// 다중 인스턴스 운영 시에는 Redis 등 공유 저장소로 옮겨야 한다.
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 10;
const rateBuckets = new Map<string, number[]>();

function isRateLimited(userId: string): boolean {
  const now = Date.now();
  const bucket = rateBuckets.get(userId) ?? [];
  // 만료된 타임스탬프 제거.
  const fresh = bucket.filter((ts) => now - ts < RATE_LIMIT_WINDOW_MS);
  if (fresh.length >= RATE_LIMIT_MAX) {
    rateBuckets.set(userId, fresh);
    return true;
  }
  fresh.push(now);
  rateBuckets.set(userId, fresh);
  return false;
}

// 메모리 캐시 — 동일 (genre, level) 쌍에 대한 LLM 결과 5분 재사용.
// 키에 userId를 포함해 cross-user 노출 방지(설계 결정 — 사용자별 미세한
// 변형이 들어갈 여지를 남겨두기 위함).
const CACHE_TTL_MS = 5 * 60_000;
interface CacheEntry {
  value: IntakeQuestions;
  expiresAt: number;
}
const cache = new Map<string, CacheEntry>();

function cacheKey(userId: string, genre: string, cefr: string, age: number): string {
  return `${userId}:${genre}:${cefr}:${age}`;
}

function readCache(key: string): IntakeQuestions | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (entry.expiresAt < Date.now()) {
    cache.delete(key);
    return null;
  }
  return entry.value;
}

function writeCache(key: string, value: IntakeQuestions): void {
  cache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
}

/**
 * 책 생성 마법사 step 3 — 부모에게 던질 한국어 인테이크 질문 2~3개를 LLM으로 생성.
 *
 * 별 차감 없음 — 책 생성 시점에서만 차감. 동일 (genre, level) 쌍에 대해
 * 분당 10회 rate limit + 5분 메모리 캐시를 적용해 LLM 비용 폭주를 방어한다.
 *
 * LLM 실패(LLMError)는 그대로 502로 표면화 — UI에서 "그냥 만들기" CTA로 폴백한다.
 * 정적 질문 풀백업은 두지 않는다(설계 합의 — 동적 다양성이 핵심).
 */
export async function POST(req: NextRequest) {
  try {
    const body = RequestSchema.parse(await req.json());
    // 자녀 프로필 소유권 검증 — 타 user 프로필 ID로 LLM 자원 소진 차단.
    const { userId } = await requireProfileOwnershipForApi(body.profileId);

    if (isRateLimited(userId)) {
      return NextResponse.json(
        { error: 'rate_limited', message: '잠시 후 다시 시도해 주세요.' },
        { status: 429 },
      );
    }

    // 자녀 나이는 books 생성 흐름과 동일하게 profile에서 조회 — 프론트가
    // age를 보내지 않도록 해 위변조 표면을 줄인다.
    const [profile] = await db
      .select({ age: profiles.age })
      .from(profiles)
      .where(eq(profiles.id, body.profileId))
      .limit(1);
    if (!profile) {
      // 소유권 검증을 통과했는데 행이 사라지는 경쟁상태 — 동일 정책으로 404.
      throw new ApiAuthError('not_found', 404);
    }

    const key = cacheKey(userId, body.genre, body.cefr, profile.age);
    const cached = readCache(key);
    if (cached) {
      return NextResponse.json({ questions: cached.questions, cached: true });
    }

    const result = await generateIntakeQuestions({
      genre: body.genre,
      level: { age: profile.age, cefr: body.cefr },
    });
    writeCache(key, result);

    return NextResponse.json({ questions: result.questions, cached: false });
  } catch (err) {
    return handleApiError(err);
  }
}
