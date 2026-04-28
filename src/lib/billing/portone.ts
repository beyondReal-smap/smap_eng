/**
 * 포트원(PortOne) V2 REST API 서버사이드 클라이언트.
 *
 * 공식 문서: https://developers.portone.io/api/rest-v2
 *  - base URL: https://api.portone.io
 *  - 인증: API Secret으로 토큰 발급(POST /login/api-secret) → Authorization: Bearer {accessToken}
 *  - 결제 단건 조회: GET /payments/{paymentId}
 *
 * 보안 모델:
 *  - PORTONE_API_SECRET 은 서버에서만 사용. 클라이언트 번들에 절대 포함 금지.
 *  - accessToken 은 메모리에 캐시(만료 60초 전 자동 재발급).
 *  - 에러 응답은 message 본문에 PG 측 디테일이 들어올 수 있으므로 호출부 로그에서만 사용,
 *    클라이언트에는 code 만 전달.
 *
 * confirm 흐름:
 *  1) 클라이언트가 redirectUrl로 돌아오며 paymentId/code/message 부착.
 *  2) /api/payments/confirm 가 paymentId 로 GetPayment 호출.
 *  3) 응답 status='PAID' && amount.total === orders.amount 검증 → 적립.
 */

import { parseEnvString } from '@/lib/env';

const PORTONE_API_BASE = 'https://api.portone.io';
const TOKEN_ENDPOINT = '/login/api-secret';
const TOKEN_REFRESH_BUFFER_MS = 60_000; // 만료 1분 전부터 재발급
const REQUEST_TIMEOUT_MS = 15_000;

export interface PortOnePaymentAmount {
  total: number;
  taxFree?: number;
  vat?: number;
  currency?: string;
}

export interface PortOnePaymentMethod {
  type?: string;
  [k: string]: unknown;
}

/**
 * 포트원 결제 단건 조회 응답 중 우리 도메인이 사용하는 필드만 좁게 정의.
 * forward-compat — 추가 필드는 무시.
 */
export interface PortOnePayment {
  id: string;
  status: string;
  transactionId?: string;
  paidAt?: string;
  receiptUrl?: string;
  method?: PortOnePaymentMethod;
  amount: PortOnePaymentAmount;
  currency?: string;
  customer?: { id?: string; [k: string]: unknown };
}

export class PortOneError extends Error {
  constructor(
    public httpStatus: number,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = 'PortOneError';
  }
}

interface CachedToken {
  accessToken: string;
  refreshToken: string;
  /** epoch ms — 이 시점부터는 만료 가능, refresh 권장. */
  refreshAt: number;
}

/**
 * 포트원 발급 토큰 메모리 캐시. Next.js Node 런타임에서 라우트 핸들러 간 공유.
 *  - 모듈 스코프 변수라 PM2 cluster instance 수만큼 사본 존재(=instance 별로 발급).
 *  - 빈도 낮음(결제 confirm 시점에만), 영향 미미.
 */
let cachedToken: CachedToken | null = null;

function readApiSecret(): string {
  const v = parseEnvString('PORTONE_API_SECRET', { required: true });
  if (!v) throw new Error('PORTONE_API_SECRET missing');
  return v;
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

async function issueToken(): Promise<CachedToken> {
  const apiSecret = readApiSecret();
  let res: Response;
  try {
    res = await fetchWithTimeout(`${PORTONE_API_BASE}${TOKEN_ENDPOINT}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiSecret }),
    });
  } catch (err) {
    const message =
      err instanceof Error && err.name === 'AbortError'
        ? 'portone token timeout'
        : 'portone token network error';
    throw new PortOneError(0, 'NETWORK_ERROR', message);
  }
  const text = await res.text();
  let body: unknown;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    throw new PortOneError(res.status, 'INVALID_RESPONSE', 'non-JSON token response');
  }
  if (!res.ok) {
    const e = body as { type?: unknown; message?: unknown } | null;
    const code = typeof e?.type === 'string' ? e.type : 'TOKEN_FAILED';
    const message =
      typeof e?.message === 'string' ? e.message : `portone token failed status=${res.status}`;
    throw new PortOneError(res.status, code, message);
  }
  const tok = body as { accessToken?: unknown; refreshToken?: unknown } | null;
  if (
    !tok ||
    typeof tok.accessToken !== 'string' ||
    typeof tok.refreshToken !== 'string'
  ) {
    throw new PortOneError(res.status, 'INVALID_RESPONSE', 'token response missing fields');
  }
  // 포트원 토큰 만료시간은 응답에 별도로 들어오지 않을 수 있어,
  // 보수적으로 30분 후 재발급(공식 권장: 토큰 만료 전 refresh).
  const refreshAt = Date.now() + 30 * 60 * 1000 - TOKEN_REFRESH_BUFFER_MS;
  return {
    accessToken: tok.accessToken,
    refreshToken: tok.refreshToken,
    refreshAt,
  };
}

async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.refreshAt) {
    return cachedToken.accessToken;
  }
  cachedToken = await issueToken();
  return cachedToken.accessToken;
}

/**
 * 결제 단건 조회. confirm 라우트가 redirect 후 호출.
 *
 * paymentId 는 우리가 발급한 값(orders.paymentId). PG 거래 식별자(transactionId)는
 * 응답에서 추출해 orders.pgTxId 로 저장한다.
 */
export async function getPortOnePayment(paymentId: string): Promise<PortOnePayment> {
  // 1차 시도 → 401이면 토큰 강제 재발급 후 1회 재시도.
  let token = await getAccessToken();
  let res = await callGetPayment(paymentId, token);
  if (res.status === 401) {
    cachedToken = null;
    token = await getAccessToken();
    res = await callGetPayment(paymentId, token);
  }
  const text = await res.text();
  let body: unknown;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    throw new PortOneError(res.status, 'INVALID_RESPONSE', 'non-JSON payment response');
  }
  if (!res.ok) {
    const e = body as { type?: unknown; message?: unknown } | null;
    const code = typeof e?.type === 'string' ? e.type : 'GET_PAYMENT_FAILED';
    const message =
      typeof e?.message === 'string'
        ? e.message
        : `portone get payment failed status=${res.status}`;
    throw new PortOneError(res.status, code, message);
  }
  const p = body as Partial<PortOnePayment> | null;
  if (
    !p ||
    typeof p.id !== 'string' ||
    typeof p.status !== 'string' ||
    !p.amount ||
    typeof p.amount.total !== 'number'
  ) {
    throw new PortOneError(res.status, 'INVALID_RESPONSE', 'payment response missing fields');
  }
  return p as PortOnePayment;
}

async function callGetPayment(paymentId: string, token: string): Promise<Response> {
  const url = `${PORTONE_API_BASE}/payments/${encodeURIComponent(paymentId)}`;
  try {
    return await fetchWithTimeout(url, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch (err) {
    const message =
      err instanceof Error && err.name === 'AbortError'
        ? 'portone get payment timeout'
        : 'portone get payment network error';
    throw new PortOneError(0, 'NETWORK_ERROR', message);
  }
}
