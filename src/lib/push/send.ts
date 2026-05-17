import { and, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { pushTokens } from '@/lib/db/schema';
import {
  FcmError,
  isUnregisteredError,
  sendPushToDevice,
  type FcmAlertPayload,
} from './fcm';

/** apns.ts 시그니처와 호환 — 기존 호출처(notify-weekly 등)가 그대로 import 가능. */
export type PushAlertPayload = FcmAlertPayload;
/** @deprecated send.ts 외부 호출자가 옛 이름을 그대로 쓰는 경우를 위한 alias. */
export type ApnsAlertPayload = FcmAlertPayload;

/**
 * 한 사용자의 모든 등록된 디바이스(iOS/Android)에 푸시 발송.
 *
 * - push_tokens에서 user_id로 활성 토큰 전체 조회 (platform 무관)
 * - FCM이 iOS/Android 분기를 내부적으로 처리하므로 호출자는 단일 인터페이스만 신경
 * - 영구 무효 토큰(`isUnregisteredError`)이면 해당 행 삭제
 * - 그 외 에러는 로그만 — 한 디바이스 실패가 다른 디바이스 발송을 막지 않음 (Promise.allSettled)
 *
 * 비동기 fire-and-forget으로 호출자가 await 없이 호출해도 됨 — 푸시 실패가
 * 본 작업(결제 검증, 책 생성 완료 알림 등)을 막아서는 안 된다.
 */
export async function sendPushToUser(
  userId: string,
  payload: PushAlertPayload,
): Promise<{ success: number; failure: number; dropped: number }> {
  const tokens = await db
    .select()
    .from(pushTokens)
    .where(eq(pushTokens.userId, userId));

  if (tokens.length === 0) {
    return { success: 0, failure: 0, dropped: 0 };
  }

  const results = await Promise.allSettled(
    tokens.map((t) => sendPushToDevice(t.deviceToken, payload)),
  );

  let success = 0;
  let failure = 0;
  let dropped = 0;

  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    const token = tokens[i];

    if (result.status === 'fulfilled') {
      success++;
      continue;
    }

    const err = result.reason;
    if (isUnregisteredError(err)) {
      // 영구 무효 → 행 삭제. 같은 디바이스가 재로그인하면 register 라우트로 다시 들어옴.
      await db
        .delete(pushTokens)
        .where(
          and(
            eq(pushTokens.userId, userId),
            eq(pushTokens.deviceToken, token.deviceToken),
          ),
        )
        .catch(() => {
          /* 삭제 실패도 무시 */
        });
      dropped++;
      console.warn('[push] dropped unregistered token', {
        userId,
        platform: token.platform,
      });
    } else if (err instanceof FcmError) {
      failure++;
      console.warn('[push] fcm error', {
        userId,
        platform: token.platform,
        code: err.code,
      });
    } else {
      failure++;
      console.error('[push] unexpected', err);
    }
  }

  return { success, failure, dropped };
}

/**
 * 여러 사용자에게 같은 메시지 발송 — 관리자 세그먼트 발송용.
 *
 * 사용자별 토큰 조회/발송을 병렬 처리하되 메모리 폭발 방지를 위해 chunk(50)로 나눈다.
 * 각 청크 내부는 Promise.allSettled로 독립 진행.
 */
export async function sendPushToUsers(
  userIds: string[],
  payload: PushAlertPayload,
): Promise<{ success: number; failure: number; dropped: number; sendCount: number }> {
  const totals = { success: 0, failure: 0, dropped: 0, sendCount: 0 };
  const CHUNK = 50;

  for (let i = 0; i < userIds.length; i += CHUNK) {
    const chunk = userIds.slice(i, i + CHUNK);
    const results = await Promise.allSettled(
      chunk.map((uid) => sendPushToUser(uid, payload)),
    );
    for (const r of results) {
      if (r.status === 'fulfilled') {
        totals.success += r.value.success;
        totals.failure += r.value.failure;
        totals.dropped += r.value.dropped;
        totals.sendCount += r.value.success + r.value.failure + r.value.dropped;
      } else {
        totals.failure += 1;
        totals.sendCount += 1;
      }
    }
  }

  return totals;
}
