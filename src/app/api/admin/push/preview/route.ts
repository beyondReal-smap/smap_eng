import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { assertAdminApi } from '@/lib/auth/session';
import { handleApiError } from '@/app/api/_lib/errors';
import { resolveAudience } from '@/lib/push/audience';
import { PUSH_SEND_AUDIENCES } from '@/lib/db/schema';

export const runtime = 'nodejs';

const PreviewRequest = z.object({
  audience: z.enum(PUSH_SEND_AUDIENCES),
  /** single audience일 때만 사용 — 이메일 또는 user id. */
  targetIdentifier: z.string().trim().min(1).max(255).optional(),
});

/**
 * 발송 전 대상 인원 미리보기 — 단건은 1/0, 세그먼트는 인구수만 반환.
 * 실제 user id 목록은 노출하지 않는다(권한 분리: preview는 카운트만, send만 풀 목록 확보).
 */
export async function POST(req: NextRequest) {
  try {
    await assertAdminApi();
    const { audience, targetIdentifier } = PreviewRequest.parse(await req.json());
    const resolution = await resolveAudience(audience, { targetIdentifier });
    return NextResponse.json({
      audience: resolution.audience,
      audienceCount: resolution.audienceCount,
      notFound: resolution.notFound ?? false,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
