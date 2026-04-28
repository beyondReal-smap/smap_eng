import { and, eq, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { creditBalances, creditTransactions } from '@/lib/db/schema';

/**
 * 크레딧(별) 원장 관리 — 잔액 갱신 + 원장 기록을 원자적으로 수행.
 *
 * 동시성:
 *  - `INSERT ... ON DUPLICATE KEY UPDATE` 로 행 선삽입 (존재 보장)
 *  - `SELECT ... FOR UPDATE` 로 행 잠금 → 동시 grant/consume 경쟁 방지
 *  - 최종 UPDATE 후 원장 INSERT 까지 동일 트랜잭션
 *
 * 주의: 이 파일은 별도 호출부(예: /api/admin/credits/:userId POST) 에서만 사용된다.
 * 차감(consume)은 별도 함수로 분리하되, 현재 MVP에서는 grant 만 필요.
 */

export interface CreditBalanceView {
  /** 사용 가능한 별 잔액 */
  balance: number;
  /** 누적 충전량(환불 제외) — 마이페이지 "총 충전" 표시용 */
  totalPurchased: number;
}

/**
 * 별 잔액 조회 — 읽기 전용. 행이 없으면 0/0 반환(잠금/생성 없음).
 *
 * 행 생성은 첫 grant/consume 호출에서 이루어지므로, 단순 조회 시점에는
 * 일부러 행을 만들지 않는다(불필요한 쓰기 방지 + 미가입 사용자에 대한 0 응답).
 */
export async function getCreditBalance(
  userId: string,
): Promise<CreditBalanceView> {
  const [row] = await db
    .select({
      balance: creditBalances.balance,
      totalPurchased: creditBalances.totalPurchased,
    })
    .from(creditBalances)
    .where(eq(creditBalances.userId, userId))
    .limit(1);

  if (!row) return { balance: 0, totalPurchased: 0 };
  return { balance: row.balance, totalPurchased: row.totalPurchased };
}

export class InvalidCreditDeltaError extends Error {
  constructor(public value: unknown) {
    super(`invalid credit delta: ${String(value)}`);
    this.name = 'InvalidCreditDeltaError';
  }
}

export interface GrantResult {
  balance: number;
  txId: number;
}

export async function grantCredits(
  userId: string,
  delta: number,
): Promise<GrantResult> {
  if (!Number.isInteger(delta) || delta <= 0) {
    throw new InvalidCreditDeltaError(delta);
  }

  return db.transaction(async (tx) => {
    // 1) 행 선삽입. 존재하면 no-op (user_id = user_id 는 실질 변경 없음).
    await tx.execute(
      sql`INSERT INTO ${creditBalances} (user_id, balance, total_purchased)
          VALUES (${userId}, 0, 0)
          ON DUPLICATE KEY UPDATE user_id = user_id`,
    );

    // 2) FOR UPDATE 로 행 잠금 → 현재 잔액 읽기.
    const locked = (await tx.execute(
      sql`SELECT balance FROM ${creditBalances}
          WHERE user_id = ${userId} FOR UPDATE`,
    )) as unknown as [Array<{ balance: number | string }>, unknown];
    const rows = locked[0];
    const current = Number(rows?.[0]?.balance ?? 0);
    const next = current + delta;

    // 3) 잔액 업데이트.
    await tx
      .update(creditBalances)
      .set({ balance: next })
      .where(eq(creditBalances.userId, userId));

    // 4) 원장 기록 (kind='grant', 양수 delta).
    const [{ id }] = await tx
      .insert(creditTransactions)
      .values({ userId, kind: 'grant', delta })
      .$returningId();

    return { balance: next, txId: id };
  });
}

/**
 * 잔액 부족 시 throw — API 라우트에서 402 Payment Required로 매핑된다.
 *
 * 메시지는 사용자 노출용이 아니라 디버그/로그 용도. UI 토스트는 STAR_COPY.insufficient
 * 사용 (errors.ts에서 응답에 채워줌).
 */
export class InsufficientCreditsError extends Error {
  readonly status = 402 as const;
  readonly balance: number;
  readonly required: number;
  constructor(balance: number, required: number) {
    super(`insufficient credits: balance=${balance}, required=${required}`);
    this.name = 'InsufficientCreditsError';
    this.balance = balance;
    this.required = required;
  }
}

export interface ConsumeResult {
  balance: number;
  txId: number;
}

/**
 * 별 1개 차감 + 원장 기록을 원자적으로 수행.
 *
 * 동시성: grantCredits와 동일하게 행 선삽입 + FOR UPDATE 잠금으로
 *         동시 차감 경쟁(잔액 1·요청 2건)에서 단 한 건만 통과시킨다.
 *
 * 잔액이 부족하면 InsufficientCreditsError를 던지며, 트랜잭션은 롤백된다.
 */
export async function consumeCredit(userId: string): Promise<ConsumeResult> {
  return db.transaction(async (tx) => {
    // 1) 행 선삽입(잔액 0). 존재하면 no-op.
    await tx.execute(
      sql`INSERT INTO ${creditBalances} (user_id, balance, total_purchased)
          VALUES (${userId}, 0, 0)
          ON DUPLICATE KEY UPDATE user_id = user_id`,
    );

    // 2) FOR UPDATE 로 행 잠금 → 잔액 확인.
    const locked = (await tx.execute(
      sql`SELECT balance FROM ${creditBalances}
          WHERE user_id = ${userId} FOR UPDATE`,
    )) as unknown as [Array<{ balance: number | string }>, unknown];
    const rows = locked[0];
    const current = Number(rows?.[0]?.balance ?? 0);
    if (current < 1) {
      throw new InsufficientCreditsError(current, 1);
    }
    const next = current - 1;

    // 3) 잔액 차감.
    await tx
      .update(creditBalances)
      .set({ balance: next })
      .where(eq(creditBalances.userId, userId));

    // 4) 원장 기록 (kind='consume', 음수 delta).
    const [{ id }] = await tx
      .insert(creditTransactions)
      .values({ userId, kind: 'consume', delta: -1 })
      .$returningId();

    return { balance: next, txId: id };
  });
}

export interface RefundResult {
  /** 'refunded' = 이번 호출에서 새로 환불 처리, 'noop' = 이미 환불된 tx (idempotent). */
  status: 'refunded' | 'noop';
  /** 환불 후 잔액. noop이면 현재 잔액. */
  balance: number;
  /** 신규 refund 원장 id. noop이면 기존 환불 행 id. */
  refundTxId: number;
}

export class InvalidRefundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidRefundError';
  }
}

/**
 * 별 차감 보상(환불) — 책 생성 실패 시 사용자가 잃은 별을 복구한다.
 *
 * 정책:
 *  - 입력 `consumeTxId`는 반드시 동일 user의 'consume' 행이어야 함 (cross-user 차단).
 *  - idempotent: `reversed_tx_id`에 UNIQUE 제약. 두 번째 호출은 'noop' 반환.
 *  - 환불 단위는 원본 차감의 `|delta|`. 현재 정책상 1이지만 일반화.
 *  - 잠금: `credit_balances` 행 FOR UPDATE → 동시 grant/consume과 직렬화.
 *
 * 호출처: `/api/books` POST의 LLM/DB 실패 catch 블록. 결제 환불은 별도 정책(불가).
 */
export async function refundCredit(
  userId: string,
  consumeTxId: number,
): Promise<RefundResult> {
  if (!Number.isInteger(consumeTxId) || consumeTxId <= 0) {
    throw new InvalidRefundError(`invalid consumeTxId: ${consumeTxId}`);
  }

  return db.transaction(async (tx) => {
    // 1) 원본 consume tx 검증 — userId 일치 + kind='consume' + delta<0.
    const [orig] = await tx
      .select({
        userId: creditTransactions.userId,
        kind: creditTransactions.kind,
        delta: creditTransactions.delta,
      })
      .from(creditTransactions)
      .where(eq(creditTransactions.id, consumeTxId))
      .limit(1);

    if (!orig) {
      throw new InvalidRefundError(`consume tx not found: id=${consumeTxId}`);
    }
    if (orig.userId !== userId) {
      throw new InvalidRefundError(
        `consume tx ${consumeTxId} does not belong to user ${userId}`,
      );
    }
    if (orig.kind !== 'consume' || orig.delta >= 0) {
      throw new InvalidRefundError(
        `tx ${consumeTxId} is not a consume tx (kind=${orig.kind}, delta=${orig.delta})`,
      );
    }
    const refundDelta = -orig.delta; // 양수

    // 2) idempotency 체크 — 이미 환불 행이 있으면 no-op.
    const [existing] = await tx
      .select({
        id: creditTransactions.id,
      })
      .from(creditTransactions)
      .where(
        and(
          eq(creditTransactions.kind, 'refund'),
          eq(creditTransactions.reversedTxId, consumeTxId),
        ),
      )
      .limit(1);

    if (existing) {
      // 잔액은 별도 SELECT (잠금 불필요 — idempotent 응답).
      const [bal] = await tx
        .select({ balance: creditBalances.balance })
        .from(creditBalances)
        .where(eq(creditBalances.userId, userId))
        .limit(1);
      return {
        status: 'noop',
        balance: bal?.balance ?? 0,
        refundTxId: existing.id,
      };
    }

    // 3) 행 잠금 + 잔액 복구.
    await tx.execute(
      sql`INSERT INTO ${creditBalances} (user_id, balance, total_purchased)
          VALUES (${userId}, 0, 0)
          ON DUPLICATE KEY UPDATE user_id = user_id`,
    );
    const locked = (await tx.execute(
      sql`SELECT balance FROM ${creditBalances}
          WHERE user_id = ${userId} FOR UPDATE`,
    )) as unknown as [Array<{ balance: number | string }>, unknown];
    const current = Number(locked[0]?.[0]?.balance ?? 0);
    const next = current + refundDelta;

    await tx
      .update(creditBalances)
      .set({ balance: next })
      .where(eq(creditBalances.userId, userId));

    // 4) 환불 원장 INSERT — UNIQUE(reversed_tx_id) 위반 시 동시성 race 패배 → noop 처리.
    try {
      const [{ id: refundTxId }] = await tx
        .insert(creditTransactions)
        .values({
          userId,
          kind: 'refund',
          delta: refundDelta,
          reversedTxId: consumeTxId,
        })
        .$returningId();
      return { status: 'refunded', balance: next, refundTxId };
    } catch (e) {
      // 다른 트랜잭션이 먼저 환불 행을 INSERT한 경우. 잔액은 그쪽이 갱신했으므로 롤백.
      if (
        e instanceof Error &&
        /Duplicate entry|ER_DUP_ENTRY/i.test(e.message)
      ) {
        throw new InvalidRefundError(
          `concurrent refund detected for tx ${consumeTxId} — retry as noop`,
        );
      }
      throw e;
    }
  });
}
