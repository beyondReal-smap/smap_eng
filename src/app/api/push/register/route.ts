import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { pushTokens, type PushEnvironment, type PushPlatform } from '@/lib/db/schema';
import { requireUserIdForApi } from '@/lib/auth/session';
import { handleApiError } from '../../_lib/errors';

export const runtime = 'nodejs';

// FCM registration token: 영문/숫자/_/- 혼합 ~150자. 보수적으로 32~512 허용.
// 과거 APNs hex 강제는 제거 — Firebase로 통합되면서 토큰 포맷이 바뀌었다.
const RegisterRequest = z.object({
  deviceToken: z
    .string()
    .min(32)
    .max(512)
    .regex(/^[A-Za-z0-9_:\-\/.]+$/, 'invalid_token_format'),
  platform: z.enum(['ios', 'android']).default('ios'),
  // environment는 FCM에서는 의미 없지만 backward-compat을 위해 받기만 한다.
  environment: z.enum(['production', 'sandbox']).default('production'),
});

/**
 * iOS/Android가 발급받은 FCM registration token을 등록.
 *
 * 같은 device_token이 이미 다른 user에게 등록돼 있어도(기기 공유/계정 전환 시나리오)
 * user_id를 갱신하고 last_seen_at을 새로고침한다.
 *
 * platform은 'ios' | 'android'. iOS 클라이언트는 Firebase SDK가 APNs token을 받아
 * 자동으로 FCM token으로 변환해 주므로, 클라이언트가 보내는 토큰은 항상 FCM 형식.
 */
export async function POST(req: NextRequest) {
  try {
    const userId = await requireUserIdForApi();
    const { deviceToken, platform, environment } = RegisterRequest.parse(await req.json());
    const env: PushEnvironment = environment;
    const plat: PushPlatform = platform;

    // INSERT ... ON DUPLICATE KEY UPDATE — device_token UNIQUE 충돌 시 user/platform 갱신.
    await db.execute(
      sql`INSERT INTO ${pushTokens} (user_id, device_token, platform, environment, last_seen_at, created_at)
          VALUES (${userId}, ${deviceToken}, ${plat}, ${env}, NOW(), NOW())
          ON DUPLICATE KEY UPDATE
            user_id = ${userId},
            platform = ${plat},
            environment = ${env},
            last_seen_at = NOW()`,
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
