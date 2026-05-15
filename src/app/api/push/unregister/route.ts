import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { and, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { pushTokens } from '@/lib/db/schema';
import { requireUserIdForApi } from '@/lib/auth/session';
import { handleApiError } from '../../_lib/errors';

export const runtime = 'nodejs';

const UnregisterRequest = z.object({
  deviceToken: z.string().min(40).max(200).regex(/^[0-9a-fA-F]+$/),
});

/**
 * 로그아웃 또는 권한 거절 시 해당 디바이스의 푸시 등록을 해제.
 * 다른 user의 토큰을 임의 삭제하지 못하도록 user_id + device_token 둘 다 일치할 때만 삭제.
 */
export async function POST(req: NextRequest) {
  try {
    const userId = await requireUserIdForApi();
    const { deviceToken } = UnregisterRequest.parse(await req.json());

    await db
      .delete(pushTokens)
      .where(
        and(
          eq(pushTokens.userId, userId),
          eq(pushTokens.deviceToken, deviceToken),
        ),
      );

    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
