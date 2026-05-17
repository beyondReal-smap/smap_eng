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

// iOS APNs: hex 64자(8+24+32). 향후 변경 대비 200.
const ApnsToken = z.string().min(40).max(200).regex(/^[0-9a-fA-F]+$/);
// FCM registration token: 가변 길이 base64url + `:` 포함. 보통 ~163자, 가끔 더 김.
const FcmToken = z.string().min(40).max(255).regex(/^[A-Za-z0-9_\-:.]+$/);

const RegisterRequest = z.discriminatedUnion('platform', [
  z.object({
    platform: z.literal('ios'),
    deviceToken: ApnsToken,
    environment: z.enum(['production', 'sandbox']).default('production'),
  }),
  z.object({
    platform: z.literal('android'),
    deviceToken: FcmToken,
    // Android 는 환경 분기 없음 — 무조건 production.
    environment: z.literal('production').default('production'),
  }),
]);

/**
 * 푸시 디바이스 토큰 등록 (iOS APNs / Android FCM 공용).
 *
 * 같은 device_token 이 이미 다른 user 에게 등록돼 있어도(기기 공유) user_id 를 갱신하고
 * last_seen_at 을 새로 고침한다.
 *
 * Body:
 *   { "platform": "ios", "deviceToken": "<hex>", "environment": "production"|"sandbox" }
 *   { "platform": "android", "deviceToken": "<fcm registration token>" }
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
