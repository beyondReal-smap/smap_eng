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
 *  - 지급 완료(granted)와 레거시 verified 거래는 환불 상태 전환 + 잔액 차감
 *  - 미지급 확정(pending_grant) 거래는 상태만 전환하고 잔액을 차감하지 않음
 *  - status='refunded'였으면 멱등 — 이미 차감 처리됨 → applied=false
 *  - 음수 balance 허용: 사용자가 별을 이미 다 써버린 후 환불받는 경우 balance가 음수가 될 수 있음.
 *    다음 충전 시 자연스럽게 0 이상으로 복귀. 별 사용은 잔액 0보다 클 때만 가능하므로 추가 위험 없음.
 *
 * 트랜잭션: 잔액과 iap_transactions 행을 순서대로 잠그고 상태 변경·차감을 한 단위로 처리.
 */
export async function refundIapTransaction(
  transactionId: string,
): Promise<RefundResult | null> {
  return db.transaction(async (tx) => {
    const candidate = (await tx.execute(
      sql`SELECT user_id FROM ${iapTransactions}
          WHERE transaction_id = ${transactionId}`,
    )) as unknown as [Array<{ user_id: string }>, unknown];
    const candidateUserId = candidate[0]?.[0]?.user_id;
    if (!candidateUserId) return null;

    // 지급 함수와 같은 balance → IAP 순서로 잠가 동시 환불/재시도 교착을 피한다.
    await tx.execute(
      sql`INSERT INTO ${creditBalances} (user_id, balance, total_purchased)
          VALUES (${candidateUserId}, 0, 0)
          ON DUPLICATE KEY UPDATE user_id = user_id`,
    );
    await tx.execute(
      sql`SELECT balance FROM ${creditBalances}
          WHERE user_id = ${candidateUserId} FOR UPDATE`,
    );

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

    // 운영 검증으로 미지급이 확정된 거래는 차감할 잔액이 없다.
    if (row.status === 'pending_grant') {
      return { applied: true, stars: row.stars, userId: row.user_id };
    }

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
