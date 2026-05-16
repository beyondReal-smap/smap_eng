import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  AppleIapError,
  verifyAppleSignedJws,
  verifyNotificationTransactionInfo,
} from '@/lib/iap/apple-verifier';
import { refundIapTransaction } from '@/lib/iap/refund';

export const runtime = 'nodejs';

/**
 * App Store Server Notifications V2 — Apple이 환불/만료 등 이벤트를 webhook으로 전송.
 *
 * 등록: App Store Connect → App Information → App Store Server Notifications →
 *   Production Server URL: https://eng.smap.site/api/iap/notifications
 *   Sandbox Server URL: 동일 (환경은 payload.data.environment로 분기)
 *   Version: 2.0
 *
 * Payload 구조 (간략):
 *   {
 *     "signedPayload": "<JWS>"
 *   }
 *   JWS payload:
 *   {
 *     notificationType: 'REFUND' | 'CONSUMPTION_REQUEST' | 'TEST' | ...,
 *     subtype?: string,
 *     notificationUUID: string,
 *     data?: {
 *       environment: 'Sandbox' | 'Production',
 *       bundleId: string,
 *       signedTransactionInfo?: string,  // 또 다른 JWS
 *       ...
 *     },
 *     ...
 *   }
 *
 * 처리:
 *   - REFUND → iap_transactions status='refunded' + 잔액 차감 (음수 허용)
 *   - 그 외(TEST/구독 등) → 200으로 응답만, 비즈니스 로직 없음
 *
 * Apple은 5xx를 받으면 최대 ~10회 재시도 → 200 응답이 모든 처리 완료를 의미해야 한다.
 * 멱등성: 같은 notificationUUID가 두 번 도착해도 안전 (refund 함수 자체가 멱등).
 */

const Body = z.object({
  signedPayload: z.string().min(1),
});

interface NotificationPayload {
  notificationType: string;
  subtype?: string;
  notificationUUID: string;
  version: string;
  signedDate?: number;
  data?: {
    appAppleId?: number;
    bundleId: string;
    bundleVersion?: string;
    environment: 'Sandbox' | 'Production';
    signedTransactionInfo?: string;
    signedRenewalInfo?: string;
  };
}

export async function POST(req: NextRequest) {
  const expectedBundleId = process.env.APPLE_SIGN_IN_CLIENT_ID;
  if (!expectedBundleId) {
    // 설정 누락은 5xx — Apple이 재시도하도록.
    console.error('[iap-notify] APPLE_SIGN_IN_CLIENT_ID missing');
    return NextResponse.json({ error: 'iap_not_configured' }, { status: 500 });
  }

  let body: { signedPayload: string };
  try {
    body = Body.parse(await req.json());
  } catch {
    // 잘못된 body는 4xx — Apple이 재시도하지 않도록.
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }

  let notification: NotificationPayload;
  try {
    notification = await verifyAppleSignedJws<NotificationPayload>(
      body.signedPayload,
    );
  } catch (err) {
    if (err instanceof AppleIapError) {
      console.warn('[iap-notify] reject jws', err.code);
      return NextResponse.json({ error: err.code }, { status: 400 });
    }
    throw err;
  }

  // Bundle id 매칭 — 잘못 라우팅된 알림 차단.
  if (notification.data && notification.data.bundleId !== expectedBundleId) {
    console.warn(
      '[iap-notify] bundle mismatch',
      notification.data.bundleId,
      'expected',
      expectedBundleId,
    );
    return NextResponse.json({ error: 'invalid_bundle' }, { status: 400 });
  }

  const logCtx = {
    type: notification.notificationType,
    subtype: notification.subtype,
    uuid: notification.notificationUUID,
    env: notification.data?.environment,
  };

  switch (notification.notificationType) {
    case 'REFUND': {
      // signedTransactionInfo 필수.
      const txJws = notification.data?.signedTransactionInfo;
      if (!txJws) {
        console.warn('[iap-notify] REFUND missing signedTransactionInfo', logCtx);
        return NextResponse.json({ ok: true });
      }
      try {
        const txPayload = await verifyNotificationTransactionInfo(
          txJws,
          expectedBundleId,
        );
        const result = await refundIapTransaction(txPayload.transactionId);
        if (!result) {
          console.warn(
            '[iap-notify] REFUND tx not found',
            txPayload.transactionId,
            logCtx,
          );
        } else {
          console.log('[iap-notify] REFUND', {
            ...logCtx,
            transactionId: txPayload.transactionId,
            stars: result.stars,
            applied: result.applied,
          });
        }
      } catch (err) {
        if (err instanceof AppleIapError) {
          console.warn('[iap-notify] REFUND tx jws reject', err.code, logCtx);
          return NextResponse.json({ error: err.code }, { status: 400 });
        }
        throw err;
      }
      return NextResponse.json({ ok: true });
    }

    case 'TEST':
      console.log('[iap-notify] TEST received', logCtx);
      return NextResponse.json({ ok: true });

    default:
      // CONSUMPTION_REQUEST / DID_RENEW / DID_CHANGE_RENEWAL_STATUS 등 — 우리 Consumable 모델엔 무관.
      // 추후 구독 도입 시 핸들러 확장.
      console.log('[iap-notify] ignored', logCtx);
      return NextResponse.json({ ok: true });
  }
}
