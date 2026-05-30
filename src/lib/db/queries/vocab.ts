import { and, eq, gte, sql } from 'drizzle-orm';
import { db } from '../index';
import {
  vocabGradeLog,
  vocabProgress,
  type VocabGrade,
  type VocabProgress,
} from '../schema';

// ===== Vocab progress / grade log =====

/// Leitner 인터벌(ms) — 5분 / 1일 / 3일 / 7일. 단말 SrsStore와 동일한 상수.
const VOCAB_INTERVAL_MS = [
  5 * 60 * 1000,
  24 * 60 * 60 * 1000,
  3 * 24 * 60 * 60 * 1000,
  7 * 24 * 60 * 60 * 1000,
];
const VOCAB_MAX_LEVEL = 3;

/** 정규화된 단어 키(소문자 + 양끝 공백/구두점 제거). 단말 `srsNormalizeKey`와 동일. */
export function normalizeVocabKey(word: string): string {
  return word.trim().toLowerCase().replace(/[.,!?;:"']/g, '');
}

export async function listVocabProgressByProfile(
  profileId: number,
): Promise<VocabProgress[]> {
  return db
    .select()
    .from(vocabProgress)
    .where(eq(vocabProgress.profileId, profileId));
}

/**
 * 단어를 평가하고 진도 스냅샷 + 이벤트 로그를 함께 기록한다.
 * - 트랜잭션 한 단위 — log가 남되 progress 갱신 실패하는 경우를 막는다
 * - prev/next level은 log에 동봉 (분석용)
 */
export async function gradeVocabWord(args: {
  profileId: number;
  word: string;
  grade: VocabGrade;
}): Promise<VocabProgress> {
  const key = normalizeVocabKey(args.word);
  if (!key) {
    throw new Error('empty_word_key');
  }
  const nowMs = Date.now();

  return await db.transaction(async (tx) => {
    const [prev] = await tx
      .select()
      .from(vocabProgress)
      .where(
        and(
          eq(vocabProgress.profileId, args.profileId),
          eq(vocabProgress.wordKey, key),
        ),
      )
      .limit(1);

    const prevLevel = prev?.level ?? 0;
    const nextLevel =
      args.grade === 'again'
        ? 0
        : Math.min(VOCAB_MAX_LEVEL, prevLevel + 1);
    const interval =
      VOCAB_INTERVAL_MS[nextLevel] ?? VOCAB_INTERVAL_MS[VOCAB_MAX_LEVEL];

    const row = {
      profileId: args.profileId,
      wordKey: key,
      level: nextLevel,
      dueAtMs: nowMs + interval,
      lastGradedAtMs: nowMs,
    };

    if (prev) {
      await tx
        .update(vocabProgress)
        .set({
          level: row.level,
          dueAtMs: row.dueAtMs,
          lastGradedAtMs: row.lastGradedAtMs,
        })
        .where(
          and(
            eq(vocabProgress.profileId, args.profileId),
            eq(vocabProgress.wordKey, key),
          ),
        );
    } else {
      await tx.insert(vocabProgress).values(row);
    }

    await tx.insert(vocabGradeLog).values({
      profileId: args.profileId,
      wordKey: key,
      grade: args.grade,
      prevLevel,
      nextLevel,
    });

    // 반환은 갱신 후 row. updatedAt은 DB 기본값 — 다시 select하지 않고 시간만 nowMs로 동봉.
    return {
      ...row,
      updatedAt: new Date(nowMs),
    } as VocabProgress;
  });
}

/**
 * 최근 N일 일자별 평가 횟수 (KST 일 단위) — 학습 그래프용.
 * `grade='good'` / `grade='again'` 분리 카운트.
 */
export async function listVocabGradesByDay(args: {
  profileId: number;
  days: number;
}): Promise<{ date: string; good: number; again: number }[]> {
  const sinceMs = Date.now() - args.days * 24 * 60 * 60 * 1000;
  const rows = await db
    .select({
      day: sql<string>`DATE(${vocabGradeLog.gradedAt})`.as('day'),
      grade: vocabGradeLog.grade,
      n: sql<number>`COUNT(*)`.mapWith(Number).as('n'),
    })
    .from(vocabGradeLog)
    .where(
      and(
        eq(vocabGradeLog.profileId, args.profileId),
        gte(vocabGradeLog.gradedAt, new Date(sinceMs)),
      ),
    )
    .groupBy(sql`day, ${vocabGradeLog.grade}`)
    .orderBy(sql`day`);

  const map = new Map<string, { good: number; again: number }>();
  for (const r of rows) {
    const entry = map.get(r.day) ?? { good: 0, again: 0 };
    if (r.grade === 'good') entry.good = r.n;
    else entry.again = r.n;
    map.set(r.day, entry);
  }
  return Array.from(map.entries())
    .map(([date, v]) => ({ date, good: v.good, again: v.again }))
    .sort((a, b) => a.date.localeCompare(b.date));
}
