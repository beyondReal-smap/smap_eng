import { and, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { pushTokens } from '@/lib/db/schema';
import {
  ApnsError,
  isUnregisteredError,
  sendPushToDevice as sendPushToApns,
  type ApnsAlertPayload,
} from './apns';
import {
  FcmError,
  isUnregisteredFcmError,
  sendFcmToDevice,
  type FcmAlertPayload,
} from './fcm';

/**
 * 한 사용자의 모든 등록된 디바이스에 푸시 발송.
 *
 * platform 별로 APNs / FCM 라우팅:
 *   - ios:     `apns.ts` (token-based JWT, ES256)
 *   - android: `fcm.ts` (service account JWT, RS256)
 *
 * 영구 무효(410 Unregistered / FCM NOT_FOUND) 응답이면 해당 행 삭제.
 * 그 외 에러는 로그만 — 한 디바이스 실패가 다른 디바이스 발송을 막지 않음.
 *
 * 비동기 fire-and-forget. 푸시 실패가 본 작업(결제 검증 등)을 막아서는 안 된다.
 */
export async function sendPushToUser(
  userId: string,
  payload: ApnsAlertPayload & FcmAlertPayload,
): Promise<void> {
  const tokens = await db
    .select()
    .from(pushTokens)
    .where(eq(pushTokens.userId, userId));

  if (tokens.length === 0) return;

  await Promise.all(
    tokens.map(async (t) => {
      try {
        if (t.platform === 'android') {
          await sendFcmToDevice(t.deviceToken, payload);
        } else {
          await sendPushToApns(t.deviceToken, payload, {
            useSandbox: t.environment === 'sandbox',
          });
        }
      } catch (err) {
        const isApnsUnreg = err instanceof ApnsError && isUnregisteredError(err);
        const isFcmUnreg = err instanceof FcmError && isUnregisteredFcmError(err);
        if (isApnsUnreg || isFcmUnreg) {
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
        } else if (err instanceof ApnsError) {
          console.warn('[push] apns error', {
            userId,
            status: err.status,
            reason: err.reason,
          });
        } else if (err instanceof FcmError) {
          console.warn('[push] fcm error', {
            userId,
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
