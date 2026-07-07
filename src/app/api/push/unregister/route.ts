import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { and, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { pushTokens } from '@/lib/db/schema';
import { requireUserIdForApi } from '@/lib/auth/session';
import { handleApiError } from '../../_lib/errors';

export const runtime = 'nodejs';

// FCM registration token 포맷 — register 라우트와 동일 기준.
// 과거 APNs hex 강제(40~200자, hex only)는 FCM 토큰(':', '_', '-' 포함)을 400으로
// 거부해 로그아웃 시 토큰이 서버에 남는 버그가 있었다.
const UnregisterRequest = z.object({
  deviceToken: z
    .string()
    .min(32)
    .max(512)
    .regex(/^[A-Za-z0-9_:\-\/.]+$/, 'invalid_token_format'),
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
