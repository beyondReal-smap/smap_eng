import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { type IapPlatform } from '@/lib/db/schema';
import { requireUserIdForApi } from '@/lib/auth/session';
import { grantIapCredits } from '@/lib/billing/credits';
import { handleApiError } from '../../_lib/errors';
import {
  AppleIapError,
  verifyAppleTransactionJws,
} from '@/lib/iap/apple-verifier';
import {
  GooglePlayIapError,
  verifyGooglePlayProductPurchase,
} from '@/lib/iap/google-verifier';
import {
  isKnownIapProduct,
  starsForIapProduct,
} from '@/lib/iap/products';
import { sendPushToUser } from '@/lib/push/send';

export const runtime = 'nodejs';

const VerifyRequest = z.discriminatedUnion('platform', [
  // 기존 iOS 클라이언트는 platform 필드 없이 jws 만 보낸다 → optional default 'ios'.
  z.object({
    platform: z.literal('ios').default('ios'),
    jws: z.string().min(1),
  }),
  z.object({
    platform: z.literal('android'),
    productId: z.string().min(1).max(128),
    purchaseToken: z.string().min(1).max(2048),
  }),
]);

/**
 * StoreKit 2 / Play Billing Consumable 구매 영수증 검증.
 *
 *   iOS:     { "platform": "ios"|undefined, "jws": "<Transaction.jwsRepresentation>" }
 *   Android: { "platform": "android", "productId": "...", "purchaseToken": "..." }
 *
 * 검증 → 화이트리스트 → 거래 기록+크레딧 원자 지급 → 푸시.
 * 응답 `granted=false` 는 "이미 처리된 거래"라는 의미라 클라이언트는 큐에서 제거(finish/consume).
 */
export async function POST(req: NextRequest) {
  try {
    const userId = await requireUserIdForApi();
    const parsed = VerifyRequest.parse(await req.json());

    let platform: IapPlatform;
    let productId: string;
    let transactionId: string;
    let environment: 'production' | 'sandbox';
    let signedAt: Date | null;

    if (parsed.platform === 'android') {
      try {
        const result = await verifyGooglePlayProductPurchase(
          parsed.productId,
          parsed.purchaseToken,
        );
        platform = 'android';
        productId = result.productId;
        transactionId = result.transactionId;
        environment = 'production';
        signedAt = result.signedDate ? new Date(result.signedDate) : null;
      } catch (err) {
        if (err instanceof GooglePlayIapError) {
          console.warn('[iap-verify] android reject', err.code);
          return NextResponse.json({ error: err.code }, { status: err.status ?? 400 });
        }
        throw err;
      }
    } else {
      const bundleId = process.env.APPLE_SIGN_IN_CLIENT_ID;
      if (!bundleId) {
        return NextResponse.json({ error: 'iap_not_configured' }, { status: 500 });
      }
      try {
        const payload = await verifyAppleTransactionJws(parsed.jws, bundleId);
        platform = 'ios';
        productId = payload.productId;
        transactionId = payload.transactionId;
        environment = payload.environment === 'Sandbox' ? 'sandbox' : 'production';
        signedAt = payload.signedDate ? new Date(payload.signedDate) : null;
      } catch (err) {
        if (err instanceof AppleIapError) {
          console.warn('[iap-verify] ios reject', err.code);
          return NextResponse.json({ error: err.code }, { status: 400 });
        }
        throw err;
      }
    }

    if (!isKnownIapProduct(productId)) {
      return NextResponse.json(
        { error: 'unknown_product', productId },
        { status: 400 },
      );
    }
    const stars = starsForIapProduct(productId);
    if (stars === null) {
      return NextResponse.json({ error: 'unknown_product' }, { status: 400 });
    }

    const result = await grantIapCredits({
      userId,
      platform,
      transactionId,
      productId,
      stars,
      environment,
      signedAt,
    });

    if (result.status === 'noop') {
      return NextResponse.json({ granted: false, idempotent: true });
    }

    void sendPushToUser(userId, {
      title: '별 충전이 완료됐어요',
      body: `별 ${stars}개가 추가됐어요. 동화를 만들어 보세요.`,
      sound: 'default',
      custom: { kind: 'iap_purchase' },
    }).catch((err) => {
      console.warn('[iap-verify] push failed', err);
    });

    return NextResponse.json({
      granted: true,
      balance: result.balance,
      stars,
      productId,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
