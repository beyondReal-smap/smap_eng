import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  listVocabGradesByDay,
  listVocabProgressByProfile,
} from '@/lib/db/queries';
import { requireProfileOwnershipForApi } from '@/lib/auth/session';
import { handleApiError } from '../../_lib/errors';

export const runtime = 'nodejs';

const Query = z.object({
  profileId: z.coerce.number().int().positive(),
  // 일자별 학습 카운트 같이 받을지. 기본 false — 단순 progress fetch 시 무거운 그룹 쿼리 회피.
  days: z.coerce.number().int().positive().max(180).optional(),
});

/**
 * GET /api/vocab/progress?profileId=1[&days=30]
 * - progress: vocab_progress 전체 (단어 키 → level / dueAtMs / lastGradedAtMs)
 * - byDay: days 지정 시 최근 N일 일자별 grade 카운트
 */
export async function GET(req: NextRequest) {
  try {
    const params = Object.fromEntries(new URL(req.url).searchParams);
    const { profileId, days } = Query.parse(params);
    await requireProfileOwnershipForApi(profileId);

    const progress = await listVocabProgressByProfile(profileId);
    const byDay = days
      ? await listVocabGradesByDay({ profileId, days })
      : undefined;

    return NextResponse.json({
      // dueAtMs / lastGradedAtMs는 그대로 epoch ms 숫자로 반환 — 단말 SrsStore와 호환.
      progress: progress.map((p) => ({
        wordKey: p.wordKey,
        level: p.level,
        dueAtMs: p.dueAtMs,
        lastGradedAtMs: p.lastGradedAtMs,
      })),
      ...(byDay ? { byDay } : {}),
    });
  } catch (err) {
    return handleApiError(err);
  }
}
