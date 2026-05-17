import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import {
  pushTokens,
  type PushEnvironment,
  type PushPlatform,
} from '@/lib/db/schema';
import { requireUserIdForApi } from '@/lib/auth/session';
import { handleApiError } from '../../_lib/errors';

export const runtime = 'nodejs';

// FCM registration token: 가변 길이 base64url + `:` 포함. 보통 ~163자, 가끔 더 김.
// iOS·Android 모두 FCM 으로 통일했으므로 토큰 형식이 동일하다.
const FcmToken = z.string().min(40).max(255).regex(/^[A-Za-z0-9_\-:.]+$/);

const RegisterRequest = z.object({
  platform: z.enum(['ios', 'android']),
  deviceToken: FcmToken,
  // FCM 은 환경 분기 없음 — 호환을 위해 필드는 받지만 항상 'production' 으로 저장.
  environment: z.enum(['production', 'sandbox']).default('production'),
});

/**
 * FCM 디바이스 토큰 등록 (iOS·Android 공용).
 *
 * 같은 device_token 이 이미 다른 user 에게 등록돼 있어도(기기 공유) user_id 를 갱신하고
 * last_seen_at 을 새로 고침한다. APNs 직접 통신은 폐기되었고, iOS 도 FirebaseMessaging
 * 가 발급한 FCM token 을 보낸다.
 *
 * Body:
 *   { "platform": "ios"|"android", "deviceToken": "<fcm registration token>" }
 */
export async function POST(req: NextRequest) {
  try {
    const userId = await requireUserIdForApi();
    const parsed = RegisterRequest.parse(await req.json());
    const platform: PushPlatform = parsed.platform;
    const env: PushEnvironment = parsed.environment;

    await db.execute(
      sql`INSERT INTO ${pushTokens}
            (user_id, device_token, platform, environment, last_seen_at, created_at)
          VALUES
            (${userId}, ${parsed.deviceToken}, ${platform}, ${env}, NOW(), NOW())
          ON DUPLICATE KEY UPDATE
            user_id = ${userId},
            platform = ${platform},
            environment = ${env},
            last_seen_at = NOW()`,
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
