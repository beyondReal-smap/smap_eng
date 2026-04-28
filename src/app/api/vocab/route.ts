import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { listVocabularyByProfile } from '@/lib/db/queries';
import { requireProfileOwnershipForApi } from '@/lib/auth/session';
import { handleApiError } from '../_lib/errors';

export const runtime = 'nodejs';

const Query = z.object({
  profileId: z.coerce.number().int().positive(),
});

/**
 * GET /api/vocab?profileId=1
 * 프로필이 가진 활성 책들의 어휘를 펼쳐 반환.
 * 단어 중복은 클라이언트에서 dedupe (여러 책에서 반복 정상).
 */
export async function GET(req: NextRequest) {
  try {
    const params = Object.fromEntries(new URL(req.url).searchParams);
    const { profileId } = Query.parse(params);
    await requireProfileOwnershipForApi(profileId);
    return NextResponse.json({
      entries: await listVocabularyByProfile(profileId),
    });
  } catch (err) {
    return handleApiError(err);
  }
}
