/**
 * 토스페이먼츠(TossPayments) Core API v1 서버사이드 클라이언트.
 *
 * 공식: https://docs.tosspayments.com/reference
 *  - base URL: https://api.tosspayments.com
 *  - 인증: 시크릿키를 Basic Auth 로 부착. base64(`${secretKey}:`) — 비밀번호 자리는
 *          공백이므로 시크릿키 뒤에 콜론(:)만 붙여 인코딩한다(토스 규격).
 *  - 결제 승인:      POST /v1/payments/confirm
 *  - 결제 단건 조회: GET  /v1/payments/{paymentKey}
 *  - 결제 취소:      POST /v1/payments/{paymentKey}/cancel
 *
 * 부트페이와의 근본 차이:
 *  - 부트페이는 프론트 결제창에서 결제가 완결되고 서버는 영수증을 조회만 했다.
 *  - 토스는 **서버가 confirm 으로 결제를 완결**한다. 서버가 소유한 금액(order.amount)
 *    으로만 승인하므로, 사용자가 그 금액을 실제로 결제했을 때만 승인이 성공한다
 *    (금액 위변조 시 토스가 거부 — 승인 전이면 실제 청구도 없다).
 *
 * 보안 모델:
 *  - TOSS_SECRET_KEY 는 서버에서만 사용. 클라이언트 번들에 절대 포함 금지.
 *  - NEXT_PUBLIC_TOSS_CLIENT_KEY 는 공개 가능한 클라이언트키 — checkout 응답으로
 *    클라에 전달(빌드 inline 없이도 결제창 호출 가능).
 *  - 에러 message 에는 PG 측 디테일이 들어올 수 있으므로 호출부 로그에서만 사용,
 *    클라이언트에는 code 만 전달.
 *
 * confirm 흐름:
 *  1) 클라이언트 결제창(@tosspayments/tosspayments-sdk) → 인증 후 successUrl 로
 *     리다이렉트(paymentKey·orderId·amount 쿼리 부착).
 *  2) /api/payments/confirm 이 orderId(우리 paymentId)로 pending 주문을 찾고,
 *     confirmTossPayment(paymentKey, orderId, order.amount) 로 서버 금액 승인.
 *  3) status==='DONE' && totalAmount===order.amount 검증 후 적립.
 *  4) 이미 승인된 결제 재confirm(ALREADY_PROCESSED_PAYMENT)은 단건조회로 멱등 복구.
 */

import { Buffer } from 'node:buffer';

import { parseEnvString } from '@/lib/env';

const TOSS_API_BASE = 'https://api.tosspayments.com';
const REQUEST_TIMEOUT_MS = 10_000;

/** 토스 결제 상태. 'DONE'(승인 완료)만 적립 허용. */
export const TOSS_STATUS_DONE = 'DONE';

/** 이미 승인된 결제를 다시 confirm 할 때 토스가 반환하는 코드. */
export const TOSS_ALREADY_PROCESSED = 'ALREADY_PROCESSED_PAYMENT';

/**
 * 토스 Payment 객체 중 우리 도메인이 사용하는 필드만 좁게 정의.
 * forward-compat — 추가 필드는 무시.
 */
export interface TossPayment {
  paymentKey: string;
  /** 우리가 발급한 주문번호(orders.paymentId, 서버 발급 UUID)와 일치해야 함. */
  orderId?: string;
  orderName?: string;
  /** 결제 상태. TOSS_STATUS_DONE('DONE')만 적립 허용. */
  status?: string;
  /** 총 결제 금액(원). order.amount 와 대조. */
  totalAmount?: number;
  /** 결제수단(카드/가상계좌/간편결제 등). */
  method?: string;
  /** 영수증 정보. url 은 매출전표 링크. */
  receipt?: { url?: string } | null;
  [k: string]: unknown;
}

export class TossError extends Error {
  constructor(
    public httpStatus: number,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = 'TossError';
  }
}

/** 두 키가 모두 설정됐을 때만 웹 결제 활성화. checkout/confirm 진입 가드. */
export function isTossConfigured(): boolean {
  return (
    !!parseEnvString('NEXT_PUBLIC_TOSS_CLIENT_KEY') &&
    !!parseEnvString('TOSS_SECRET_KEY')
  );
}

/** 클라이언트키 — checkout 응답으로 클라이언트 결제창에 전달. */
export function getTossClientKey(): string {
  const key = parseEnvString('NEXT_PUBLIC_TOSS_CLIENT_KEY', { required: true });
  if (!key) throw new Error('NEXT_PUBLIC_TOSS_CLIENT_KEY missing');
  return key;
}

function authHeader(): string {
  const secretKey = parseEnvString('TOSS_SECRET_KEY', { required: true });
  // 시크릿키 뒤에 ':' 을 붙여 base64 — 토스 Basic Auth 규격(비밀번호 자리는 공백).
  return 'Basic ' + Buffer.from(`${secretKey}:`, 'utf-8').toString('base64');
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal, cache: 'no-store' });
  } finally {
    clearTimeout(timer);
  }
}

/** 공통 REST 호출. 인증 실패/네트워크/비-JSON/토스 에러를 TossError 로 정규화. */
async function request(
  method: 'GET' | 'POST',
  path: string,
  body?: unknown,
): Promise<Record<string, unknown>> {
  const url = `${TOSS_API_BASE}${path}`;
  let res: Response;
  try {
    res = await fetchWithTimeout(url, {
      method,
      headers: {
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        Accept: 'application/json',
        Authorization: authHeader(),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (err) {
    const message =
      err instanceof Error && err.name === 'AbortError'
        ? 'toss request timeout'
        : 'toss network error';
    throw new TossError(0, 'NETWORK_ERROR', message);
  }

  const text = await res.text();
  let parsed: unknown;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    throw new TossError(res.status, 'INVALID_RESPONSE', 'non-JSON toss response');
  }

  if (res.status === 401) {
    throw new TossError(401, 'AUTH_FAILED', 'toss 인증 실패 — TOSS_SECRET_KEY를 확인하세요');
  }
  // 토스 에러는 4xx/5xx + { code, message }. code 를 보존해 호출부에서 분기한다.
  if (!res.ok) {
    const e = parsed as { message?: unknown; code?: unknown } | null;
    const code = typeof e?.code === 'string' ? e.code : `HTTP_${res.status}`;
    const message =
      typeof e?.message === 'string'
        ? e.message
        : `toss request failed status=${res.status}`;
    throw new TossError(res.status, code, message);
  }
  if (!parsed || typeof parsed !== 'object') {
    throw new TossError(res.status, 'INVALID_RESPONSE', 'toss response not an object');
  }
  return parsed as Record<string, unknown>;
}

/**
 * 결제 승인. POST /v1/payments/confirm.
 * 서버가 소유한 amount 로만 호출해 위변조를 차단한다(실제 결제 금액과 다르면 토스가 거부).
 * 이미 승인된 결제 재요청 시 code=ALREADY_PROCESSED_PAYMENT (호출부가 조회로 멱등 복구).
 */
export async function confirmTossPayment(
  paymentKey: string,
  orderId: string,
  amount: number,
): Promise<TossPayment> {
  const data = await request('POST', '/v1/payments/confirm', {
    paymentKey,
    orderId,
    amount,
  });
  return data as unknown as TossPayment;
}

/**
 * 결제 단건 조회. GET /v1/payments/{paymentKey}.
 * confirm 재요청(ALREADY_PROCESSED) 시 실제 승인 상태를 확인해 멱등 복구하는 용도.
 */
export async function getTossPayment(paymentKey: string): Promise<TossPayment> {
  const data = await request(
    'GET',
    `/v1/payments/${encodeURIComponent(paymentKey)}`,
  );
  return data as unknown as TossPayment;
}

/**
 * 결제 전액 취소. POST /v1/payments/{paymentKey}/cancel.
 * 승인 응답 금액이 서버 기대치와 다른 이례적 상황 등에서 "받은 결제를 되돌리기" 위해 호출.
 */
export async function cancelTossPayment(
  paymentKey: string,
  reason: string,
): Promise<void> {
  await request('POST', `/v1/payments/${encodeURIComponent(paymentKey)}/cancel`, {
    cancelReason: reason,
  });
}
