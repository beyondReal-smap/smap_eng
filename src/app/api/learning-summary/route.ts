import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getLearningSummary } from '@/lib/db/queries';
import { requireProfileOwnershipForApi } from '@/lib/auth/session';
import { handleApiError } from '../_lib/errors';

export const runtime = 'nodejs';

const Query = z.object({
  profileId: z.coerce.number().int().positive(),
});

/**
 * GET /api/learning-summary?profileId=1
 * 프로필별 reading_logs 집계.
 */
export async function GET(req: NextRequest) {
  try {
    const params = Object.fromEntries(new URL(req.url).searchParams);
    const { profileId } = Query.parse(params);
    await requireProfileOwnershipForApi(profileId);
    return NextResponse.json({
      summary: await getLearningSummary(profileId),
    });
  } catch (err) {
    return handleApiError(err);
  }
}
