import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { gradeVocabWord } from '@/lib/db/queries';
import { requireProfileOwnershipForApi } from '@/lib/auth/session';
import { handleApiError } from '../../_lib/errors';

export const runtime = 'nodejs';

const Body = z.object({
  profileId: z.number().int().positive(),
  // 원본 단어. 서버에서 정규화 키로 변환.
  word: z.string().trim().min(1).max(80),
  grade: z.enum(['again', 'good']),
});

/**
 * POST /api/vocab/grade { profileId, word, grade }
 * 단말 SRS 평가를 서버 vocab_progress + vocab_grade_log 양쪽에 기록한다.
 * - progress: (profileId, wordKey) UPSERT — 단말과 동일한 Leitner 인터벌 계산
 * - log: 평가 한 번 = 한 줄 — 일자별 학습 그래프/통계용
 */
export async function POST(req: NextRequest) {
  try {
    const body = Body.parse(await req.json());
    await requireProfileOwnershipForApi(body.profileId);
    const progress = await gradeVocabWord({
      profileId: body.profileId,
      word: body.word,
      grade: body.grade,
    });
    return NextResponse.json({ progress });
  } catch (err) {
    return handleApiError(err);
  }
}
