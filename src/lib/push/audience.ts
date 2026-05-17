/**
 * 관리자 푸시 발송 대상 세그먼트 산출.
 *
 * 각 audience 키마다 user_id 목록 + 인원수를 반환. 미리보기(/preview)에서는 카운트만,
 * 실제 발송(/send)에서는 전체 목록을 사용한다.
 *
 * 정의:
 *  - single        : 단일 사용자 (이메일 또는 user_id로 지정)
 *  - all_active    : push_tokens가 등록되어 있고 최근 30일 안에 갱신된 사용자
 *  - subscribers   : 활성 구독자 (subscriptions.status='active')
 *  - dormant       : 등록된 push_token은 있으나 last_seen_at이 14일 이상 지난 사용자
 *  - new_users     : 가입 7일 이내 사용자 중 push_token이 있는 사용자
 *
 * push_token이 없는 사용자는 어떤 세그먼트에서도 포함되지 않는다 — 발송 의미가 없으므로.
 */

import { and, eq, gte, isNotNull, lt } from 'drizzle-orm';
import { db } from '@/lib/db';
import { pushTokens, subscriptions, users } from '@/lib/db/schema';
import type { PushSendAudience } from '@/lib/db/schema';

const ACTIVE_WINDOW_DAYS = 30;
const DORMANT_THRESHOLD_DAYS = 14;
const NEW_USER_WINDOW_DAYS = 7;

function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

export interface AudienceResolveOptions {
  /** single 발송 시 대상 식별자. 이메일 또는 user id. */
  targetIdentifier?: string;
}

export interface AudienceResolution {
  audience: PushSendAudience;
  userIds: string[];
  /** 토큰 보유한 디바이스가 1개라도 있는 사용자 수와 동일. */
  audienceCount: number;
  /** single audience에서 대상이 식별되지 않은 경우. */
  notFound?: boolean;
}

export async function resolveAudience(
  audience: PushSendAudience,
  options: AudienceResolveOptions = {},
): Promise<AudienceResolution> {
  switch (audience) {
    case 'single':
      return resolveSingle(options.targetIdentifier);
    case 'all_active':
      return resolveActive();
    case 'subscribers':
      return resolveSubscribers();
    case 'dormant':
      return resolveDormant();
    case 'new_users':
      return resolveNewUsers();
  }
}

async function resolveSingle(identifier?: string): Promise<AudienceResolution> {
  if (!identifier) {
    return { audience: 'single', userIds: [], audienceCount: 0, notFound: true };
  }
  // 우선 user id로 시도, 없으면 email로 시도. push_token 보유 여부도 같이 확인.
  const trimmed = identifier.trim();
  const byIdRows = await db
    .select({ id: users.id })
    .from(users)
    .innerJoin(pushTokens, eq(pushTokens.userId, users.id))
    .where(eq(users.id, trimmed))
    .limit(1);
  if (byIdRows.length > 0) {
    return { audience: 'single', userIds: [byIdRows[0].id], audienceCount: 1 };
  }
  const byEmailRows = await db
    .select({ id: users.id })
    .from(users)
    .innerJoin(pushTokens, eq(pushTokens.userId, users.id))
    .where(eq(users.email, trimmed))
    .limit(1);
  if (byEmailRows.length > 0) {
    return { audience: 'single', userIds: [byEmailRows[0].id], audienceCount: 1 };
  }
  return { audience: 'single', userIds: [], audienceCount: 0, notFound: true };
}

async function resolveActive(): Promise<AudienceResolution> {
  const rows = await db
    .selectDistinct({ id: pushTokens.userId })
    .from(pushTokens)
    .where(gte(pushTokens.lastSeenAt, daysAgo(ACTIVE_WINDOW_DAYS)));
  const userIds = rows.map((r) => r.id);
  return { audience: 'all_active', userIds, audienceCount: userIds.length };
}

async function resolveSubscribers(): Promise<AudienceResolution> {
  // 구독자 정의: subscriptions 테이블에 row가 존재하는 사용자(=결제 이력 보유자).
  // 현재 스키마엔 명시적 status 컬럼이 없고, cycleAnchorDay row가 곧 결제 시점에 생성된다.
  // push_token 보유자만 — '구독자에게만 푸시'는 토큰 미보유자도 카운트하면 오해소지.
  const rows = await db
    .selectDistinct({ id: pushTokens.userId })
    .from(pushTokens)
    .innerJoin(subscriptions, eq(subscriptions.userId, pushTokens.userId))
    .where(isNotNull(subscriptions.id));
  const userIds = rows.map((r) => r.id);
  return { audience: 'subscribers', userIds, audienceCount: userIds.length };
}

async function resolveDormant(): Promise<AudienceResolution> {
  const rows = await db
    .selectDistinct({ id: pushTokens.userId })
    .from(pushTokens)
    .where(lt(pushTokens.lastSeenAt, daysAgo(DORMANT_THRESHOLD_DAYS)));
  const userIds = rows.map((r) => r.id);
  return { audience: 'dormant', userIds, audienceCount: userIds.length };
}

async function resolveNewUsers(): Promise<AudienceResolution> {
  // 가입 직후엔 push 등록을 안 한 경우도 많아 INNER JOIN으로 토큰 보유자만.
  const rows = await db
    .selectDistinct({ id: pushTokens.userId })
    .from(pushTokens)
    .innerJoin(users, eq(users.id, pushTokens.userId))
    .where(and(gte(users.createdAt, daysAgo(NEW_USER_WINDOW_DAYS))));
  const userIds = rows.map((r) => r.id);
  return { audience: 'new_users', userIds, audienceCount: userIds.length };
}
