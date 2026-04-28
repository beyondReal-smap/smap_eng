import { NextResponse } from 'next/server';
import { z } from 'zod';
import { and, eq, sql } from 'drizzle-orm';

import { db } from '@/lib/db';
import {
  orders,
  creditBalances,
  creditTransactions,
} from '@/lib/db/schema';
import { getPortOnePayment, PortOneError } from '@/lib/billing/portone';
import { requireUserIdForApi } from '@/lib/auth/session';
import { handleApiError } from '../../_lib/errors';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * 결제 승인 — /subscribe/success 페이지가 포트원 redirect 후 paymentId 만 전달.
 *
 * 클라이언트가 보낸 paymentId 로 포트원 GET /payments/{id} 단건 조회 후 검증·적립.
 * (포트원이 PG와 confirm 을 자체 처리하므로, 우리는 검증·적립만 담당.)
 *
 * 보안 모델:
 *  1) paymentId 는 클라이언트가 보내지만, DB 의 pending 주문(서버 발급)과
 *     userId 까지 함께 일치해야 함. 다른 사용자의 paymentId 도용 방지.
 *  2) 이미 confirmed 행이면 동일 결과 200 반환 — 새로고침/중복 콜백 idempotent.
 *  3) 포트원 단건 조회 응답 status='PAID' && amount.total === orders.amount 까지
 *     모두 일치해야 적립.
 *  4) 적립 트랜잭션:
 *     - orders status='confirmed', pgTxId/payMethod/receiptUrl 채움
 *     - creditBalances FOR UPDATE → balance/totalPurchased 증가
 *     - creditTransactions kind='purchase' 원장 기록.
 *
 * 환불 정책: 환불 불가 — 이 라우트는 confirm 전용. cancel 엔드포인트 없음.
 */
const ConfirmSchema = z.object({
  paymentId: z.string().min(6).max(64),
});

export async function POST(req: Request) {
  try {
    const userId = await requireUserIdForApi();
    const body = await req.json();
    const { paymentId } = ConfirmSchema.parse(body);

    // 1) pending 주문 조회 — userId 까지 일치해야 함.
    const [order] = await db
      .select()
      .from(orders)
      .where(and(eq(orders.paymentId, paymentId), eq(orders.userId, userId)))
      .limit(1);

    if (!order) {
      return NextResponse.json(
        { error: 'order_not_found' },
        { status: 404 },
      );
    }

    // 2) idempotent — 이미 confirmed 면 동일 결과 반환.
    if (order.status === 'confirmed') {
      return NextResponse.json({
        ok: true,
        already: true,
        stars: order.stars,
        receiptUrl: order.receiptUrl ?? null,
      });
    }

    if (order.status === 'failed') {
      return NextResponse.json(
        { error: 'order_failed' },
        { status: 409 },
      );
    }

    // 3) 포트원 단건 조회 — 실패 시 status='failed' 마킹 후 4xx/5xx.
    let payment;
    try {
      payment = await getPortOnePayment(paymentId);
    } catch (err) {
      if (err instanceof PortOneError) {
        console.error('[payments/confirm] portone get failed', {
          paymentId,
          httpStatus: err.httpStatus,
          code: err.code,
          message: err.message,
        });
        await db
          .update(orders)
          .set({
            status: 'failed',
            failureCode: err.code.slice(0, 64),
          })
          .where(eq(orders.id, order.id));
        return NextResponse.json(
          { error: 'portone_lookup_failed', code: err.code },
          { status: err.httpStatus >= 400 && err.httpStatus < 500 ? 400 : 502 },
        );
      }
      throw err;
    }

    // 4) 결제 상태/금액 검증.
    //    PortOne V2 결제 완료 status: 'PAID'.
    //    그 외(READY/PENDING/FAILED/CANCELLED 등)는 적립 금지.
    if (payment.status !== 'PAID') {
      await db
        .update(orders)
        .set({ status: 'failed', failureCode: `STATUS_${payment.status}`.slice(0, 64) })
        .where(eq(orders.id, order.id));
      return NextResponse.json(
        { error: 'payment_not_paid', status: payment.status },
        { status: 400 },
      );
    }
    if (payment.amount.total !== order.amount) {
      await db
        .update(orders)
        .set({ status: 'failed', failureCode: 'AMOUNT_MISMATCH' })
        .where(eq(orders.id, order.id));
      return NextResponse.json(
        { error: 'amount_mismatch_upstream' },
        { status: 502 },
      );
    }

    const pgTxId = payment.transactionId ?? null;
    const payMethod = typeof payment.method?.type === 'string' ? payment.method.type : null;
    const receiptUrl = payment.receiptUrl ?? null;

    // 5) 트랜잭션: 주문 confirm + 크레딧 적립 + 원장 기록.
    await db.transaction(async (tx) => {
      // 5-1) 동시 confirm — affectedRows=0 이면 다른 요청이 먼저 처리.
      const updateRes = (await tx.execute(
        sql`UPDATE ${orders}
            SET status = 'confirmed',
                pg_tx_id = ${pgTxId},
                pay_method = ${payMethod},
                receipt_url = ${receiptUrl},
                confirmed_at = NOW()
            WHERE id = ${order.id} AND status = 'pending'`,
      )) as unknown as [{ affectedRows: number }, unknown];
      const affected = updateRes[0]?.affectedRows ?? 0;
      if (affected === 0) return;

      // 5-2) creditBalances 행 보장 + FOR UPDATE.
      await tx.execute(
        sql`INSERT INTO ${creditBalances} (user_id, balance, total_purchased)
            VALUES (${userId}, 0, 0)
            ON DUPLICATE KEY UPDATE user_id = user_id`,
      );
      await tx.execute(
        sql`SELECT balance FROM ${creditBalances}
            WHERE user_id = ${userId} FOR UPDATE`,
      );

      // 5-3) 잔액/누적 충전 증가.
      await tx
        .update(creditBalances)
        .set({
          balance: sql`${creditBalances.balance} + ${order.stars}`,
          totalPurchased: sql`${creditBalances.totalPurchased} + ${order.stars}`,
        })
        .where(eq(creditBalances.userId, userId));

      // 5-4) 원장.
      await tx.insert(creditTransactions).values({
        userId,
        kind: 'purchase',
        delta: order.stars,
        packageId: order.packageId,
      });
    });

    return NextResponse.json({
      ok: true,
      already: false,
      stars: order.stars,
      receiptUrl,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
