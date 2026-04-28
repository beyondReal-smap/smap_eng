import { NextResponse } from 'next/server';
import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import { and, eq, sql } from 'drizzle-orm';

import { db } from '@/lib/db';
import { orders, STAR_PACK_IDS } from '@/lib/db/schema';
import { getPackage } from '@/lib/billing/packages';
import { requireUserIdForApi } from '@/lib/auth/session';
import { handleApiError } from '../../_lib/errors';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** 동일 사용자가 동시에 가질 수 있는 'pending' 주문 상한.
 *  결제창 닫힘·새로고침으로 자연 누적되지만, 스크립트 남용으로 DB가 쌓이는 걸 막는다. */
const MAX_PENDING_ORDERS_PER_USER = 5;

/**
 * 결제 시작 — 클라이언트가 포트원 결제창을 띄우기 직전 호출.
 *
 * 보안 모델:
 *  - amount/stars 는 서버에서 packageId 로 재조회 (클라이언트 값 신뢰 금지).
 *  - paymentId 는 서버에서 발급(UUID v4) → 클라이언트 위변조 불가.
 *    포트원 V2 paymentId 규격(영문/숫자/-/_ 6~64자)을 UUID v4(36자)가 충족.
 *  - status='pending' 행을 미리 INSERT → confirm 단계에서 행 존재/금액 일치 검증.
 *  - 동일 user 의 pending 주문이 상한 초과 시 429 — DoS·DB 누적 차단.
 *
 * 응답:
 *  - { paymentId, amount, orderName } — 클라이언트가 PortOne.requestPayment() 에 사용.
 *  - storeId/channelKey 는 NEXT_PUBLIC_* 으로 클라이언트 빌드에 inline 되므로
 *    서버 응답에 굳이 포함하지 않는다(빌드 산출물에 이미 들어 있음).
 */
const CheckoutSchema = z.object({
  packageId: z.enum(STAR_PACK_IDS),
});

export async function POST(req: Request) {
  try {
    const userId = await requireUserIdForApi();
    const body = await req.json();
    const { packageId } = CheckoutSchema.parse(body);

    const pack = getPackage(packageId);

    // pending 주문 상한 가드. count(*) 직접 계산 — Drizzle count import 회피.
    const [pendingRow] = await db
      .select({ pending: sql<number>`count(*)` })
      .from(orders)
      .where(and(eq(orders.userId, userId), eq(orders.status, 'pending')));
    const pendingCount = Number(pendingRow?.pending ?? 0);
    if (pendingCount >= MAX_PENDING_ORDERS_PER_USER) {
      return NextResponse.json(
        { error: 'too_many_pending_orders' },
        { status: 429 },
      );
    }

    // UUID v4 (36자) — 포트원 paymentId 규격 6~64자 영문/숫자/-/_ 충족.
    const paymentId = randomUUID();

    await db.insert(orders).values({
      userId,
      packageId,
      amount: pack.priceKrw,
      stars: pack.stars,
      paymentId,
      status: 'pending',
    });

    return NextResponse.json({
      paymentId,
      amount: pack.priceKrw,
      orderName: pack.name,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
