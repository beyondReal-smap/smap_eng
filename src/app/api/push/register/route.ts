import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { pushTokens, type PushEnvironment } from '@/lib/db/schema';
import { requireUserIdForApi } from '@/lib/auth/session';
import { handleApiError } from '../../_lib/errors';

export const runtime = 'nodejs';

const RegisterRequest = z.object({
  deviceToken: z.string().min(40).max(200).regex(/^[0-9a-fA-F]+$/),
  environment: z.enum(['production', 'sandbox']).default('production'),
});

/**
 * iOS가 `application(_:didRegisterForRemoteNotificationsWithDeviceToken:)`에서
 * 받은 device token을 등록.
 *
 * 같은 device_token이 이미 다른 user에게 등록돼 있어도(기기 공유 시나리오) user_id를
 * 갱신하고 last_seen_at을 새로고침한다.
 */
export async function POST(req: NextRequest) {
  try {
    const userId = await requireUserIdForApi();
    const { deviceToken, environment } = RegisterRequest.parse(await req.json());
    const env: PushEnvironment = environment;

    // INSERT ... ON DUPLICATE KEY UPDATE — device_token UNIQUE 충돌 시 user 갱신.
    await db.execute(
      sql`INSERT INTO ${pushTokens} (user_id, device_token, environment, last_seen_at, created_at)
          VALUES (${userId}, ${deviceToken}, ${env}, NOW(), NOW())
          ON DUPLICATE KEY UPDATE
            user_id = ${userId},
            environment = ${env},
            last_seen_at = NOW()`,
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
