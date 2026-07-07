import { NextResponse } from 'next/server';
import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import { and, eq, sql } from 'drizzle-orm';

import { db } from '@/lib/db';
import { orders, STAR_PACK_IDS } from '@/lib/db/schema';
import { getPackage } from '@/lib/billing/packages';
import { getTossClientKey, isTossConfigured } from '@/lib/billing/toss';
import { requireUserIdForApi } from '@/lib/auth/session';
import { handleApiError } from '../../_lib/errors';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** 동일 사용자가 동시에 가질 수 있는 'pending' 주문 상한.
 *  결제창 닫힘·새로고침으로 자연 누적되지만, 스크립트 남용으로 DB가 쌓이는 걸 막는다. */
const MAX_PENDING_ORDERS_PER_USER = 5;

/** pending 주문의 유효 수명(분). 이 시간이 지나도록 confirm 되지 않은 주문은 결제창
 *  이탈로 방치된 것으로 보고 만료(status='failed', EXPIRED)한다. confirm 전이라 실제
 *  청구가 없어 만료는 안전하며, 토스 결제창 세션(수 분)보다 충분히 길어 진행 중인 정상
 *  결제를 건드리지 않는다. 이게 없으면 이탈 주문이 영구 누적돼 상한에 걸려 429가 지속된다. */
const PENDING_ORDER_TTL_MINUTES = 30;

/**
 * 결제 시작 — 클라이언트가 부트페이 결제창을 띄우기 직전 호출.
 *
 * 보안 모델:
 *  - amount/stars 는 서버에서 packageId 로 재조회 (클라이언트 값 신뢰 금지).
 *  - paymentId 는 서버에서 발급(UUID v4) → 부트페이 결제창의 order_id 로 사용.
 *    클라이언트 위변조 불가 — confirm 시 receipt.order_id 와 대조해 도용/교차 차단.
 *  - status='pending' 행을 미리 INSERT → confirm 단계에서 행 존재/금액 일치 검증.
 *  - 동일 user 의 pending 주문이 상한 초과 시 429 — DoS·DB 누적 차단.
 *
 * 응답:
 *  - { paymentId, amount, orderName, clientKey, customerKey } — 클라이언트 토스
 *    payment.requestPayment() 에 사용. paymentId 는 토스 orderId 로, customerKey 는
 *    payment 객체 생성에 쓰인다.
 *  - clientKey(퍼블릭키)는 이 응답으로 전달 → 키 교체 시 재빌드 불필요.
 *    키 미설정이면 진입 자체를 503 으로 막는다.
 */
const CheckoutSchema = z.object({
  packageId: z.enum(STAR_PACK_IDS),
});

export async function POST(req: Request) {
  try {
    const userId = await requireUserIdForApi();
    const body = await req.json();
    const { packageId } = CheckoutSchema.parse(body);

    // 토스 키 미설정이면 결제 진입 차단(pending order 를 만들기 전에).
    if (!isTossConfigured()) {
      return NextResponse.json(
        { error: 'payment_not_configured' },
        { status: 503 },
      );
    }

    const pack = getPackage(packageId);

    // 오래된 pending(결제창 이탈·미완료)을 먼저 만료 → 상한 가드가 진행 중인 결제만 센다.
    // NOW()/DATE_SUB 는 DB 클럭 기준 — 앱 서버와의 타임존 편차 영향을 받지 않는다.
    // 상수(TTL)만 raw 삽입(사용자 입력 아님) → 인젝션 위험 없음.
    await db
      .update(orders)
      .set({ status: 'failed', failureCode: 'EXPIRED' })
      .where(
        and(
          eq(orders.userId, userId),
          eq(orders.status, 'pending'),
          sql`${orders.createdAt} < DATE_SUB(NOW(), INTERVAL ${sql.raw(
            String(PENDING_ORDER_TTL_MINUTES),
          )} MINUTE)`,
        ),
      );

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

    // UUID v4 (36자) — 부트페이 order_id 로 사용. confirm 시 영수증의 order_id 와 대조.
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
      clientKey: getTossClientKey(),
      // 토스 payment({ customerKey }) 용 — 계정별 고정 키(2~50자, 영숫자+-_=.@)
      customerKey: `eng_${userId}`,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
