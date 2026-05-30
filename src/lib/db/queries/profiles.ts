import { and, asc, eq, isNull } from 'drizzle-orm';
import { db } from '../index';
import { profiles, type NewProfile, type Profile } from '../schema';

// ===== Profiles =====

// 특정 user(부모 계정)의 자녀 프로필 목록 — users(1) ↔ profiles(N). soft-deleted 제외.
export async function listProfiles(userId: string): Promise<Profile[]> {
  return db
    .select()
    .from(profiles)
    .where(and(eq(profiles.userId, userId), isNull(profiles.deletedAt)))
    .orderBy(asc(profiles.createdAt));
}

/// 소유권 검증을 포함한 프로필 soft delete. 다른 user의 프로필이거나 이미 삭제된 경우 null 반환.
/// 책/학습기록은 cascade 삭제되지 않고 그대로 보존 — 통계/원장 추적용. ProfilePickerView가
/// listProfiles 결과만 보여주므로 사용자에게는 깔끔히 사라진다.
export async function softDeleteProfile(args: {
  profileId: number;
  userId: string;
}): Promise<Profile | null> {
  const [existing] = await db
    .select()
    .from(profiles)
    .where(
      and(
        eq(profiles.id, args.profileId),
        eq(profiles.userId, args.userId),
        isNull(profiles.deletedAt),
      ),
    )
    .limit(1);
  if (!existing) return null;

  await db
    .update(profiles)
    .set({ deletedAt: new Date() })
    .where(eq(profiles.id, args.profileId));

  return { ...existing, deletedAt: new Date() };
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
