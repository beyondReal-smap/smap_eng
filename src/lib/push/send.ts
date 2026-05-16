import { and, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { pushTokens } from '@/lib/db/schema';
import {
  ApnsError,
  isUnregisteredError,
  sendPushToDevice,
  type ApnsAlertPayload,
} from './apns';

/**
 * 한 사용자의 모든 등록된 디바이스에 푸시 발송.
 *
 * - push_tokens에서 user_id로 활성 토큰 전체 조회
 * - 각 토큰 별 environment(production/sandbox)에 맞게 APNs 호스트 분기
 * - 410 Unregistered/BadDeviceToken 응답이면 해당 행 삭제 (영구 무효 토큰)
 * - 그 외 에러는 로그만 — 한 디바이스 실패가 다른 디바이스 발송을 막지 않음
 *
 * 비동기 fire-and-forget으로 호출자가 await 없이 호출해도 됨 — 푸시 실패가
 * 본 작업(결제 검증 등)을 막아서는 안 된다.
 */
export async function sendPushToUser(
  userId: string,
  payload: ApnsAlertPayload,
): Promise<void> {
  const tokens = await db
    .select()
    .from(pushTokens)
    .where(eq(pushTokens.userId, userId));

  if (tokens.length === 0) return;

  await Promise.all(
    tokens.map(async (t) => {
      try {
        await sendPushToDevice(t.deviceToken, payload, {
          useSandbox: t.environment === 'sandbox',
        });
      } catch (err) {
        if (isUnregisteredError(err)) {
          // 영구 무효 → 행 삭제. 같은 디바이스가 재로그인하면 register 라우트로 다시 들어옴.
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
          console.warn('[push] dropped unregistered token', { userId });
        } else if (err instanceof ApnsError) {
          console.warn('[push] apns error', {
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
