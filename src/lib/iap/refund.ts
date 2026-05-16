import { sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import {
  creditBalances,
  creditTransactions,
  iapTransactions,
} from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export interface RefundResult {
  /** 처음 처리되었는지 (false면 멱등 — 이미 환불 처리된 상태). */
  applied: boolean;
  /** 환불한 별 수. */
  stars: number;
  /** userId — 호출자가 로그/모니터링용으로 사용. */
  userId: string;
}

/**
 * Apple Server Notifications V2의 REFUND 이벤트 처리.
 *
 *  - iap_transactions에서 transactionId로 찾고 status='verified'였으면 환불 처리
 *  - status='refunded'였으면 멱등 — 이미 차감 처리됨 → applied=false
 *  - 음수 balance 허용: 사용자가 별을 이미 다 써버린 후 환불받는 경우 balance가 음수가 될 수 있음.
 *    다음 충전 시 자연스럽게 0 이상으로 복귀. 별 사용은 잔액 0보다 클 때만 가능하므로 추가 위험 없음.
 *
 * 트랜잭션: iap_transactions 행을 먼저 FOR UPDATE로 잠그고 status 변경 → credit 차감을 한 단위로 처리.
 */
export async function refundIapTransaction(
  transactionId: string,
): Promise<RefundResult | null> {
  return db.transaction(async (tx) => {
    const rows = (await tx.execute(
      sql`SELECT id, user_id, stars, status FROM ${iapTransactions}
          WHERE transaction_id = ${transactionId}
          FOR UPDATE`,
    )) as unknown as [
      Array<{ id: number; user_id: string; stars: number; status: string }>,
      unknown,
    ];
    const row = rows[0]?.[0];
    if (!row) return null;

    if (row.status === 'refunded') {
      return { applied: false, stars: row.stars, userId: row.user_id };
    }

    await tx
      .update(iapTransactions)
      .set({ status: 'refunded' })
      .where(eq(iapTransactions.id, row.id));

    // 잔액 차감 — 별 stars개를 빼고 음수 가능. UI는 max(balance, 0)로 표시한다.
    await tx.execute(
      sql`UPDATE ${creditBalances}
          SET balance = balance - ${row.stars}
          WHERE user_id = ${row.user_id}`,
    );

    await tx.insert(creditTransactions).values({
      userId: row.user_id,
      kind: 'refund',
      delta: -row.stars,
    });

    return { applied: true, stars: row.stars, userId: row.user_id };
  });
}
