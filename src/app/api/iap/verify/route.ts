import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { iapTransactions } from '@/lib/db/schema';
import { requireUserIdForApi } from '@/lib/auth/session';
import { grantCredits } from '@/lib/billing/credits';
import { handleApiError } from '../../_lib/errors';
import {
  AppleIapError,
  verifyAppleTransactionJws,
} from '@/lib/iap/apple-verifier';
import {
  isKnownIapProduct,
  starsForIapProduct,
} from '@/lib/iap/products';

export const runtime = 'nodejs';

const VerifyRequest = z.object({
  jws: z.string().min(1),
});

/**
 * iOS가 StoreKit 2 Transaction을 완료한 직후 호출.
 *
 *   POST /api/iap/verify
 *   { "jws": "<Transaction.jwsRepresentation>" }
 *
 * 서버 처리:
 *   1) Apple JWS 서명/체인 검증 (`verifyAppleTransactionJws`)
 *   2) productId 화이트리스트 확인 → 별 수량 산출
 *   3) `iap_transactions` INSERT (transaction_id UNIQUE → 중복 시 idempotent 응답)
 *   4) 신규 INSERT 시에만 `grantCredits` 호출
 *   5) 응답: { granted: true|false, balance?, stars? } → iOS는 `Transaction.finish()`
 *
 * 응답이 200이면 iOS는 무조건 `Transaction.finish()`를 호출해야 한다 — granted=false도
 * "이미 처리된 거래"라는 의미라 finish 가능.
 */
export async function POST(req: NextRequest) {
  try {
    const userId = await requireUserIdForApi();
    const { jws } = VerifyRequest.parse(await req.json());

    const bundleId = process.env.APPLE_SIGN_IN_CLIENT_ID;
    if (!bundleId) {
      return NextResponse.json(
        { error: 'iap_not_configured' },
        { status: 500 },
      );
    }

    let payload;
    try {
      payload = await verifyAppleTransactionJws(jws, bundleId);
    } catch (err) {
      if (err instanceof AppleIapError) {
        console.warn('[iap-verify] reject', err.code);
        return NextResponse.json(
          { error: err.code },
          { status: 400 },
        );
      }
      throw err;
    }

    if (!isKnownIapProduct(payload.productId)) {
      return NextResponse.json(
        { error: 'unknown_product', productId: payload.productId },
        { status: 400 },
      );
    }
    const stars = starsForIapProduct(payload.productId);
    if (stars === null) {
      return NextResponse.json(
        { error: 'unknown_product' },
        { status: 400 },
      );
    }

    // 같은 transactionId의 동시 요청을 직렬화 — INSERT가 unique 제약으로 한쪽만 통과한다.
    // FOR UPDATE 잠금으로 SELECT-INSERT race도 차단.
    const isNew = await db.transaction(async (tx) => {
      const existing = (await tx.execute(
        sql`SELECT id FROM ${iapTransactions}
            WHERE transaction_id = ${payload.transactionId}
            FOR UPDATE`,
      )) as unknown as [Array<{ id: number }>, unknown];
      if (existing[0]?.length > 0) {
        return false;
      }
      await tx.insert(iapTransactions).values({
        userId,
        transactionId: payload.transactionId,
        productId: payload.productId,
        stars,
        environment:
          payload.environment === 'Sandbox' ? 'sandbox' : 'production',
        signedAt: payload.signedDate
          ? new Date(payload.signedDate)
          : null,
        status: 'verified',
      });
      return true;
    });

    if (!isNew) {
      // 이미 처리됨 — 멱등 응답. iOS는 그래도 finish() 해야 한다.
      return NextResponse.json({ granted: false, idempotent: true });
    }

    try {
      const result = await grantCredits(userId, stars);
      return NextResponse.json({
        granted: true,
        balance: result.balance,
        stars,
        productId: payload.productId,
      });
    } catch (err) {
      // INSERT는 성공했지만 grantCredits 실패 — 운영 보정 대상.
      console.error('[iap-verify] grant failed after insert', {
        transactionId: payload.transactionId,
        userId,
        err,
      });
      throw err;
    }
  } catch (err) {
    return handleApiError(err);
  }
}
