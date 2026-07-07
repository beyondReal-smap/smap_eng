import { NextResponse } from 'next/server';
import { z } from 'zod';
import { and, eq, sql } from 'drizzle-orm';

import { db } from '@/lib/db';
import {
  orders,
  creditBalances,
  creditTransactions,
} from '@/lib/db/schema';
import {
  confirmTossPayment,
  getTossPayment,
  cancelTossPayment,
  TossError,
  TossPayment,
  TOSS_STATUS_DONE,
  TOSS_ALREADY_PROCESSED,
} from '@/lib/billing/toss';
import { requireUserIdForApi } from '@/lib/auth/session';
import { handleApiError } from '../../_lib/errors';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * 결제 승인 — 클라이언트 토스 결제창 successUrl 리다이렉트 후
 * { paymentId, paymentKey, amount } 전달(paymentId 는 토스 orderId, 우리 발급 UUID).
 *
 * 부트페이와 달리 결제의 완결점이 서버다: 서버가 소유한 order.amount 로만 confirm
 * 하므로, 사용자가 그 금액을 실제로 결제했을 때만 승인이 성공한다(금액 위변조 시
 * 토스가 거부 — 승인 전이면 실제 청구도 없다).
 *
 * 보안 모델:
 *  1) paymentId 는 서버 발급 UUID. orders 의 pending 행 + userId 까지 일치해야 함
 *     (다른 사용자의 paymentId 도용 방지).
 *  2) 이미 confirmed 행이면 동일 결과 200 — 새로고침/중복 콜백 idempotent.
 *  3) successUrl 의 amount 를 order.amount 와 1차 대조(프론트 변조 방지).
 *  4) 토스 confirm(paymentKey, orderId=paymentId, amount=order.amount) 으로 서버 금액 승인:
 *     - status === 'DONE'. 그 외 상태/파싱 불가는 fail-closed 로 거부.
 *     - payment.orderId === paymentId. orderId 는 우리가 발급한 UUID 이고 orders 에
 *       userId 가 묶여 있으므로, 이 대조 하나로 타인/교차 결제 재사용을 원천 차단.
 *     - totalAmount === order.amount. 이례적 불일치 시 전액 자동취소 후 실패 처리.
 *     - 이미 승인된 결제 재confirm(ALREADY_PROCESSED_PAYMENT)은 단건조회로 멱등 복구.
 *  5) 적립 트랜잭션(멱등):
 *     - orders status='confirmed'(status='pending' 조건부 UPDATE 로 동시성 방어),
 *       pgTxId(paymentKey)/payMethod/receiptUrl 채움
 *     - creditBalances FOR UPDATE → balance/totalPurchased 증가
 *     - creditTransactions kind='purchase' 원장 기록.
 *
 * 환불 정책: 환불 불가 — 이 라우트는 confirm 전용.
 */
const ConfirmSchema = z.object({
  // 토스 orderId = 우리 orders.paymentId(서버 발급 UUID). 6~64자, 화이트리스트 문자.
  paymentId: z
    .string()
    .min(6)
    .max(64)
    .regex(/^[A-Za-z0-9_=-]+$/),
  // 토스 결제 고유 키(successUrl paymentKey). 최대 200자, URL 조작 차단용 화이트리스트.
  paymentKey: z
    .string()
    .min(1)
    .max(200)
    .regex(/^[A-Za-z0-9_-]+$/),
  // successUrl 의 amount — order.amount 와 1차 대조. 실제 방어는 confirm 의 서버 금액.
  amount: z.number().int().nonnegative(),
});

/** 토스가 totalAmount 를 문자열로 줄 수 있어 정수로 정규화. NaN 은 검증에서 fail-closed. */
function toInt(value: unknown): number {
  return typeof value === 'number' ? value : Number(value);
}

export async function POST(req: Request) {
  try {
    const userId = await requireUserIdForApi();
    const body = await req.json();
    const { paymentId, paymentKey, amount } = ConfirmSchema.parse(body);

    // 1) pending 주문 조회 — userId 까지 일치해야 함.
    const [order] = await db
      .select()
      .from(orders)
      .where(and(eq(orders.paymentId, paymentId), eq(orders.userId, userId)))
      .limit(1);

    if (!order) {
      return NextResponse.json({ error: 'order_not_found' }, { status: 404 });
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
      return NextResponse.json({ error: 'order_failed' }, { status: 409 });
    }

    // 3) successUrl amount 1차 대조 — 서버 금액과 다르면 승인하지 않는다.
    if (amount !== order.amount) {
      await db
        .update(orders)
        .set({ status: 'failed', failureCode: 'AMOUNT_MISMATCH' })
        .where(eq(orders.id, order.id));
      return NextResponse.json({ error: 'amount_mismatch' }, { status: 400 });
    }

    // 4) 토스 승인 — 서버 소유 금액(order.amount)으로만. 실패 시 status='failed' 마킹.
    let payment: TossPayment;
    try {
      payment = await confirmTossPayment(paymentKey, paymentId, order.amount);
    } catch (err) {
      if (!(err instanceof TossError)) throw err;
      if (err.code === TOSS_ALREADY_PROCESSED) {
        // 새로고침·재시도 등으로 이미 승인됨 — 실제 상태를 조회해 멱등 복구.
        try {
          payment = await getTossPayment(paymentKey);
        } catch (err2) {
          console.error('[payments/confirm] toss lookup failed', {
            paymentId,
            err: err2 instanceof TossError ? err2.code : String(err2),
          });
          return NextResponse.json(
            { error: 'toss_confirm_failed', code: 'LOOKUP_FAILED' },
            { status: 502 },
          );
        }
      } else {
        console.error('[payments/confirm] toss confirm failed', {
          paymentId,
          httpStatus: err.httpStatus,
          code: err.code,
          message: err.message,
        });
        await db
          .update(orders)
          .set({ status: 'failed', failureCode: err.code.slice(0, 64) })
          .where(eq(orders.id, order.id));
        return NextResponse.json(
          { error: 'toss_confirm_failed', code: err.code },
          { status: err.httpStatus >= 400 && err.httpStatus < 500 ? 400 : 502 },
        );
      }
    }

    // 5) 승인 상태 확인. fail-closed — 'DONE' 이 아니면 거부.
    if (payment.status !== TOSS_STATUS_DONE) {
      await db
        .update(orders)
        .set({
          status: 'failed',
          failureCode: `STATUS_${payment.status}`.slice(0, 64),
        })
        .where(eq(orders.id, order.id));
      return NextResponse.json(
        { error: 'payment_not_paid', status: payment.status ?? null },
        { status: 400 },
      );
    }

    // 6) orderId 대조 — 이 승인이 이 주문(우리 발급 UUID)에 대한 것인지.
    //    orderId 는 서버 발급이고 orders 에 userId 가 묶여 있어, 이 대조 하나로
    //    타인 계정·다른 주문 결제 재사용을 원천 차단한다.
    if (payment.orderId !== paymentId) {
      await db
        .update(orders)
        .set({ status: 'failed', failureCode: 'ORDER_ID_MISMATCH' })
        .where(eq(orders.id, order.id));
      return NextResponse.json({ error: 'order_mismatch' }, { status: 400 });
    }

    // 7) 금액 재확인 — confirm 은 서버 금액으로 했으므로 일치가 정상. 멱등 복구 경로
    //    (getTossPayment)까지 포함해, 이례적 불일치 시 전액 자동취소 후 실패 처리.
    if (toInt(payment.totalAmount) !== order.amount) {
      try {
        await cancelTossPayment(paymentKey, '결제 금액 불일치 자동 취소');
      } catch (err) {
        // 자동취소 실패는 삼키지 않고 로그로 남겨 수동 취소를 유도(적립은 하지 않음).
        console.error(
          '[payments/confirm] toss auto-cancel failed (수동 확인 필요)',
          { paymentId, paymentKey, err },
        );
      }
      await db
        .update(orders)
        .set({ status: 'failed', failureCode: 'AMOUNT_MISMATCH' })
        .where(eq(orders.id, order.id));
      return NextResponse.json({ error: 'amount_mismatch' }, { status: 400 });
    }

    const receiptUrl =
      typeof payment.receipt?.url === 'string' ? payment.receipt.url : null;
    const payMethod =
      typeof payment.method === 'string' ? payment.method.slice(0, 32) : null;

    // 8) 트랜잭션: 주문 confirm + 크레딧 적립 + 원장 기록.
    await db.transaction(async (tx) => {
      // 8-1) 동시 confirm — affectedRows=0 이면 다른 요청이 먼저 처리.
      const updateRes = (await tx.execute(
        sql`UPDATE ${orders}
            SET status = 'confirmed',
                pg_tx_id = ${paymentKey},
                pay_method = ${payMethod},
                receipt_url = ${receiptUrl},
                confirmed_at = NOW()
            WHERE id = ${order.id} AND status = 'pending'`,
      )) as unknown as [{ affectedRows: number }, unknown];
      const affected = updateRes[0]?.affectedRows ?? 0;
      if (affected === 0) return;

      // 8-2) creditBalances 행 보장 + FOR UPDATE.
      await tx.execute(
        sql`INSERT INTO ${creditBalances} (user_id, balance, total_purchased)
            VALUES (${userId}, 0, 0)
            ON DUPLICATE KEY UPDATE user_id = user_id`,
      );
      await tx.execute(
        sql`SELECT balance FROM ${creditBalances}
            WHERE user_id = ${userId} FOR UPDATE`,
      );

      // 8-3) 잔액/누적 충전 증가.
      await tx
        .update(creditBalances)
        .set({
          balance: sql`${creditBalances.balance} + ${order.stars}`,
          totalPurchased: sql`${creditBalances.totalPurchased} + ${order.stars}`,
        })
        .where(eq(creditBalances.userId, userId));

      // 8-4) 원장.
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
