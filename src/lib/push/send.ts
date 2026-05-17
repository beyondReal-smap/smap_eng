import { and, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { pushTokens } from '@/lib/db/schema';
import {
  FcmError,
  isUnregisteredFcmError,
  sendFcmToDevice,
  type FcmAlertPayload,
} from './fcm';

/**
 * 한 사용자의 모든 등록된 디바이스에 푸시 발송.
 *
 * iOS·Android 모두 FCM HTTP v1 로 발송 — Firebase Messaging 이 iOS APNs 페어링을
 * 자동으로 처리해 단일 발송 경로로 통일된다. APNs 직접 통신(.p8 + ES256 JWT) 모듈은
 * 폐기되었다(`src/lib/push/apns.ts` 는 호환을 위해 보존하되 호출되지 않음).
 *
 * 영구 무효(FCM NOT_FOUND/UNREGISTERED) 응답이면 해당 행 삭제.
 * 그 외 에러는 로그만 — 한 디바이스 실패가 다른 디바이스 발송을 막지 않음.
 *
 * 비동기 fire-and-forget. 푸시 실패가 본 작업(결제 검증 등)을 막아서는 안 된다.
 */
export async function sendPushToUser(
  userId: string,
  payload: FcmAlertPayload & {
    /** 옛 APNs 본문 호환 필드 — 호출 측 호환을 위해 받기만 하고 FCM data 로 평탄화. */
    custom?: Record<string, unknown>;
    badge?: number;
    sound?: 'default';
  },
): Promise<void> {
  const tokens = await db
    .select()
    .from(pushTokens)
    .where(eq(pushTokens.userId, userId));

  if (tokens.length === 0) return;

  const fcmPayload: FcmAlertPayload = {
    title: payload.title,
    body: payload.body,
    data: payload.custom
      ? Object.fromEntries(
          Object.entries(payload.custom).map(([k, v]) => [k, String(v)]),
        )
      : payload.data,
  };

  await Promise.all(
    tokens.map(async (t) => {
      try {
        await sendFcmToDevice(t.deviceToken, fcmPayload);
      } catch (err) {
        if (err instanceof FcmError && isUnregisteredFcmError(err)) {
          await db
            .delete(pushTokens)
            .where(
              and(
                eq(pushTokens.userId, userId),
                eq(pushTokens.deviceToken, t.deviceToken),
              ),
            )
            .catch(() => {
              /* 삭제 실패도 무시 */
            });
          console.warn('[push] dropped unregistered token', {
            userId,
            platform: t.platform,
          });
        } else if (err instanceof FcmError) {
          console.warn('[push] fcm error', {
            userId,
            platform: t.platform,
            status: err.status,
            reason: err.reason,
          });
        } else {
          console.error('[push] unexpected', err);
        }
      }
    }),
  );
}
