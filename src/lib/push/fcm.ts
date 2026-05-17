/**
 * FCM HTTP v1 클라이언트.
 *
 * Google service account(JSON)의 private_key 로 RS256 JWT 를 만들어 OAuth2 access token 을
 * 발급받고, `https://fcm.googleapis.com/v1/projects/{projectId}/messages:send` 로 발송한다.
 *
 * APNs(`apns.ts`)와 동일하게 외부 라이브러리 없이 `node:crypto` + fetch 만 사용.
 * Access token 은 1시간 유효 — 모듈 레벨에서 50분 캐시.
 *
 * 환경변수:
 *   - FCM_SERVICE_ACCOUNT_JSON_BASE64 — service account JSON 전체를 base64 인코딩한 문자열.
 *     (또는 PATH 로 분리하지 않고 단일 env 로 묶어 PM2/Vercel 배포가 단순해진다.)
 */

import { createSign } from 'node:crypto';

const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
const FCM_SCOPE = 'https://www.googleapis.com/auth/firebase.messaging';
const TOKEN_REFRESH_MS = 50 * 60 * 1000;

interface ServiceAccount {
  client_email: string;
  private_key: string;
  project_id: string;
}

interface TokenCache {
  accessToken: string;
  fetchedAt: number;
}

let serviceAccountCache: ServiceAccount | null = null;
let tokenCache: TokenCache | null = null;

export class FcmError extends Error {
  constructor(
    public status: number,
    public reason: string,
    public token?: string,
  ) {
    super(`fcm_${status}_${reason}`);
    this.name = 'FcmError';
  }
}

export interface FcmAlertPayload {
  title: string;
  body: string;
  /** notification + data 외 옵션. Android-specific 옵션을 직접 넣고 싶을 때 사용. */
  data?: Record<string, string>;
}

function loadServiceAccount(): ServiceAccount {
  if (serviceAccountCache) return serviceAccountCache;

  const base64 = process.env.FCM_SERVICE_ACCOUNT_JSON_BASE64;
  if (!base64) {
    throw new FcmError(500, 'service_account_missing');
  }
  let parsed: ServiceAccount;
  try {
    const json = Buffer.from(base64, 'base64').toString('utf8');
    parsed = JSON.parse(json) as ServiceAccount;
  } catch (err) {
    throw new FcmError(500, 'service_account_invalid');
  }
  if (!parsed.client_email || !parsed.private_key || !parsed.project_id) {
    throw new FcmError(500, 'service_account_incomplete');
  }
  serviceAccountCache = parsed;
  return parsed;
}

function base64UrlEncode(input: Buffer | string): string {
  const buf = typeof input === 'string' ? Buffer.from(input) : input;
  return buf
    .toString('base64')
    .replace(/=+$/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function signRs256(input: string, privateKeyPem: string): string {
  const signer = createSign('RSA-SHA256');
  signer.update(input);
  signer.end();
  return base64UrlEncode(signer.sign(privateKeyPem));
}

async function fetchAccessToken(): Promise<string> {
  if (tokenCache && Date.now() - tokenCache.fetchedAt < TOKEN_REFRESH_MS) {
    return tokenCache.accessToken;
  }
  const sa = loadServiceAccount();
  const now = Math.floor(Date.now() / 1000);
  const header = base64UrlEncode(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claims = base64UrlEncode(
    JSON.stringify({
      iss: sa.client_email,
      scope: FCM_SCOPE,
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
    const detail = await response.text().catch(() => '');
    throw new FcmError(response.status, `token_exchange:${detail.slice(0, 100)}`);
  }

  const json = (await response.json()) as { access_token: string };
  tokenCache = { accessToken: json.access_token, fetchedAt: Date.now() };
  return json.access_token;
}

/**
 * 단일 FCM registration token 으로 발송.
 * 영구 무효 토큰(NOT_FOUND/UNREGISTERED)이면 [FcmError] status=404 로 표면화 → 호출자가 행 삭제.
 */
export async function sendFcmToDevice(
  token: string,
  payload: FcmAlertPayload,
): Promise<void> {
  const sa = loadServiceAccount();
  const accessToken = await fetchAccessToken();

  const url = `https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`;
  const message = {
    message: {
      token,
      notification: { title: payload.title, body: payload.body },
      data: payload.data,
      android: {
        priority: 'HIGH' as const,
        notification: {
          channel_id: 'vocab_daily',
          default_sound: true,
        },
      },
    },
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(message),
  });

  if (!response.ok) {
    const detailRaw = await response.text().catch(() => '');
    let code = 'http_error';
    try {
      const parsed = JSON.parse(detailRaw) as { error?: { status?: string } };
      if (parsed.error?.status) code = parsed.error.status;
    } catch {
      /* JSON 이 아닌 응답은 raw 그대로 reason 으로 사용. */
    }
    throw new FcmError(response.status, code, token);
  }
}

/** 영구 무효 FCM 토큰인지(`UNREGISTERED` / `INVALID_ARGUMENT`). */
export function isUnregisteredFcmError(err: unknown): boolean {
  if (!(err instanceof FcmError)) return false;
  return err.reason === 'UNREGISTERED' || err.reason === 'NOT_FOUND' || err.status === 404;
}
