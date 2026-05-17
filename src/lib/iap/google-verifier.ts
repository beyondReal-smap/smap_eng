/**
 * Google Play Developer API — Consumable IAP 영수증 검증.
 *
 * 흐름:
 *   1. service account JSON → RS256 JWT → access token 발급(`androidpublisher` scope).
 *   2. `GET /androidpublisher/v3/applications/{packageName}/purchases/products/{productId}/tokens/{purchaseToken}`
 *   3. 응답 `purchaseState=0`(Purchased) + `consumptionState=0` 확인.
 *   4. 멱등성: 동일 purchaseToken은 INSERT UNIQUE로 1회만 INSERT (caller 측 책임).
 *
 * 환경변수:
 *   - GOOGLE_PLAY_SERVICE_ACCOUNT_JSON_BASE64 — Play Console > API access 에서 다운로드한
 *     service account JSON 전체를 base64 인코딩.
 *   - GOOGLE_PLAY_PACKAGE_NAME — `site.smap.harubook.android`.
 */

import { createSign } from 'node:crypto';

const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
const SCOPE = 'https://www.googleapis.com/auth/androidpublisher';
const TOKEN_REFRESH_MS = 50 * 60 * 1000;

interface ServiceAccount {
  client_email: string;
  private_key: string;
}

let serviceAccountCache: ServiceAccount | null = null;
let tokenCache: { accessToken: string; fetchedAt: number } | null = null;

export class GooglePlayIapError extends Error {
  constructor(public code: string, public status?: number) {
    super(`google_iap_${code}`);
    this.name = 'GooglePlayIapError';
  }
}

export interface GooglePlayProductPayload {
  /** Play Console product ID — IAP_PRODUCTS 와 일치해야 함. */
  productId: string;
  /** Play Billing purchaseToken — 멱등 키. */
  transactionId: string;
  /** Play Developer API 가 반환한 purchaseTimeMillis. */
  signedDate?: number;
  /** Android 는 환경 분기 없음 — 항상 'production'. */
  environment: 'production';
}

function loadServiceAccount(): ServiceAccount {
  if (serviceAccountCache) return serviceAccountCache;

  const base64 = process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON_BASE64;
  if (!base64) throw new GooglePlayIapError('service_account_missing', 500);
  let parsed: ServiceAccount;
  try {
    const json = Buffer.from(base64, 'base64').toString('utf8');
    parsed = JSON.parse(json) as ServiceAccount;
  } catch {
    throw new GooglePlayIapError('service_account_invalid', 500);
  }
  if (!parsed.client_email || !parsed.private_key) {
    throw new GooglePlayIapError('service_account_incomplete', 500);
  }
  serviceAccountCache = parsed;
  return parsed;
}

function base64Url(input: Buffer | string): string {
  const buf = typeof input === 'string' ? Buffer.from(input) : input;
  return buf.toString('base64').replace(/=+$/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function signRs256(input: string, privateKeyPem: string): string {
  const signer = createSign('RSA-SHA256');
  signer.update(input);
  signer.end();
  return base64Url(signer.sign(privateKeyPem));
}

async function fetchAccessToken(): Promise<string> {
  if (tokenCache && Date.now() - tokenCache.fetchedAt < TOKEN_REFRESH_MS) {
    return tokenCache.accessToken;
  }
  const sa = loadServiceAccount();
  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claims = base64Url(
    JSON.stringify({
      iss: sa.client_email,
      scope: SCOPE,
      aud: TOKEN_ENDPOINT,
      iat: now,
      exp: now + 3600,
    }),
  );
  const signature = signRs256(`${header}.${claims}`, sa.private_key);
  const assertion = `${header}.${claims}.${signature}`;

  const body = new URLSearchParams({
    grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
    assertion,
  });
  const response = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!response.ok) {
    throw new GooglePlayIapError('token_exchange', response.status);
  }
  const json = (await response.json()) as { access_token: string };
  tokenCache = { accessToken: json.access_token, fetchedAt: Date.now() };
  return json.access_token;
}

interface PurchasesProductGetResponse {
  /** 0: Purchased, 1: Cancelled, 2: Pending. */
  purchaseState?: number;
  /** 0: Yet to be consumed, 1: Consumed. */
  consumptionState?: number;
  /** 0: Test (Play Console license tester), 1: Promo, 2: Rewarded. */
  purchaseType?: number;
  /** Unix epoch milliseconds. */
  purchaseTimeMillis?: string;
  /** Product ID. (Play API 는 productId 를 응답에 포함하지 않으므로 검증은 요청 경로로 식별.) */
  orderId?: string;
}

/**
 * purchaseToken 검증. 성공 시 GooglePlayProductPayload, 실패/취소/Pending 시 throw.
 */
export async function verifyGooglePlayProductPurchase(
  productId: string,
  purchaseToken: string,
): Promise<GooglePlayProductPayload> {
  const packageName = process.env.GOOGLE_PLAY_PACKAGE_NAME;
  if (!packageName) throw new GooglePlayIapError('package_name_missing', 500);

  const accessToken = await fetchAccessToken();
  const url =
    `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/` +
    `${packageName}/purchases/products/${encodeURIComponent(productId)}/tokens/` +
    `${encodeURIComponent(purchaseToken)}`;

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (response.status === 404) {
    throw new GooglePlayIapError('purchase_not_found', 404);
  }
  if (!response.ok) {
    throw new GooglePlayIapError('http_error', response.status);
  }
  const payload = (await response.json()) as PurchasesProductGetResponse;

  if (payload.purchaseState !== 0) {
    // 1=Cancelled, 2=Pending — 어느 쪽이든 적립하지 않는다.
    throw new GooglePlayIapError('purchase_not_purchased', 400);
  }

  return {
    productId,
    transactionId: purchaseToken,
    signedDate: payload.purchaseTimeMillis
      ? Number(payload.purchaseTimeMillis)
      : undefined,
    environment: 'production',
  };
}
