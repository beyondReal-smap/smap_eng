/**
 * APNs HTTP/2 클라이언트.
 *
 * Token-based authentication (.p8 + ES256 JWT). JWT는 1시간 미만 유효해야 하므로
 * 모듈 레벨에서 50분 캐시.
 *
 * 외부 라이브러리(`apn`, `@parse/node-apn`) 없이 Node.js 내장 `node:http2` +
 * `node:crypto`만 사용. 첫 출시 규모(트래픽 낮음)에 적합.
 * 추후 트래픽 증가 시 connection pooling을 가진 공식 라이브러리로 교체 검토.
 */

import http2 from 'node:http2';
import { createPrivateKey, createSign } from 'node:crypto';

const APNS_HOST_PROD = 'api.push.apple.com';
const APNS_HOST_SANDBOX = 'api.sandbox.push.apple.com';
const JWT_REFRESH_MS = 50 * 60 * 1000; // Apple 1시간 한도보다 보수적으로 50분.

interface AuthCache {
  jwt: string;
  refreshedAt: number;
}

let authCache: AuthCache | null = null;

export class ApnsError extends Error {
  constructor(
    public status: number,
    public reason: string,
    public deviceToken?: string,
  ) {
    super(`apns_${status}_${reason}`);
    this.name = 'ApnsError';
  }
}

/** 환경변수에서 APNs 설정을 모은다. 누락 시 throw. */
function readConfig() {
  const teamId = process.env.APNS_TEAM_ID;
  const keyId = process.env.APNS_KEY_ID;
  const privateKey = process.env.APNS_PRIVATE_KEY;
  const bundleId = process.env.APNS_BUNDLE_ID;
  const useSandbox = process.env.APNS_USE_SANDBOX === 'true';
  if (!teamId || !keyId || !privateKey || !bundleId) {
    throw new Error('apns_env_missing');
  }
  return { teamId, keyId, privateKey, bundleId, useSandbox };
}

/** ES256 JWT 생성 — Apple Provider Authentication 토큰. */
function makeProviderToken(): string {
  const { teamId, keyId, privateKey } = readConfig();

  const header = { alg: 'ES256', kid: keyId, typ: 'JWT' };
  const payload = { iss: teamId, iat: Math.floor(Date.now() / 1000) };

  const headerB64 = Buffer.from(JSON.stringify(header)).toString('base64url');
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signingInput = `${headerB64}.${payloadB64}`;

  const key = createPrivateKey({ key: privateKey, format: 'pem' });
  const signer = createSign('SHA256');
  signer.update(signingInput);
  signer.end();
  // ES256 JWS 표준: raw r||s (IEEE P1363) 64바이트.
  const sig = signer.sign({ key, dsaEncoding: 'ieee-p1363' });
  return `${signingInput}.${sig.toString('base64url')}`;
}

function getCachedJwt(): string {
  if (authCache && Date.now() - authCache.refreshedAt < JWT_REFRESH_MS) {
    return authCache.jwt;
  }
  const jwt = makeProviderToken();
  authCache = { jwt, refreshedAt: Date.now() };
  return jwt;
}

export interface ApnsAlertPayload {
  title?: string;
  body: string;
  /** 클라이언트가 사용하는 커스텀 데이터(딥링크 등). */
  custom?: Record<string, unknown>;
  /** 배지 — 아이콘 우측 상단 숫자. 0이면 제거. */
  badge?: number;
  /** 알림 사운드. 'default'면 시스템 사운드. */
  sound?: 'default';
}

/**
 * 단일 디바이스에 푸시 1건 발송.
 *
 * 200 응답 시 resolve(). 410(Unregistered)이면 `ApnsError` throw — 호출자가
 * push_tokens 행을 삭제하도록 처리한다.
 */
export function sendPushToDevice(
  deviceToken: string,
  payload: ApnsAlertPayload,
  options: { useSandbox?: boolean } = {},
): Promise<void> {
  const { bundleId, useSandbox: envSandbox } = readConfig();
  const useSandbox = options.useSandbox ?? envSandbox;
  const host = useSandbox ? APNS_HOST_SANDBOX : APNS_HOST_PROD;
  const jwt = getCachedJwt();

  const apsPayload: Record<string, unknown> = {
    aps: {
      alert: payload.title
        ? { title: payload.title, body: payload.body }
        : payload.body,
      sound: payload.sound,
      badge: payload.badge,
    },
    ...(payload.custom ?? {}),
  };

  return new Promise((resolve, reject) => {
    const client = http2.connect(`https://${host}`);
    // 연결 자체 실패 처리.
    client.on('error', (err) => {
      client.close();
      reject(new ApnsError(0, `connect_${(err as Error).message}`, deviceToken));
    });

    const body = Buffer.from(JSON.stringify(apsPayload));
    const req = client.request({
      ':method': 'POST',
      ':path': `/3/device/${deviceToken}`,
      authorization: `bearer ${jwt}`,
      'apns-topic': bundleId,
      'apns-push-type': 'alert',
      'apns-priority': '10',
      'content-type': 'application/json',
      'content-length': String(body.length),
    });

    let responseStatus = 0;
    let responseBody = '';

    req.on('response', (headers) => {
      responseStatus = Number(headers[':status'] ?? 0);
    });
    req.on('data', (chunk) => {
      responseBody += chunk.toString('utf8');
    });
    req.on('end', () => {
      client.close();
      if (responseStatus === 200) {
        resolve();
        return;
      }
      let reason = 'unknown';
      try {
        reason = (JSON.parse(responseBody) as { reason?: string }).reason ?? 'unknown';
      } catch {
        /* ignore */
      }
      reject(new ApnsError(responseStatus, reason, deviceToken));
    });
    req.on('error', (err) => {
      client.close();
      reject(new ApnsError(0, `req_${(err as Error).message}`, deviceToken));
    });
    req.end(body);
  });
}

/** APNs가 토큰을 영구 무효화한 경우 (410 BadDeviceToken/Unregistered). */
export function isUnregisteredError(err: unknown): boolean {
  return (
    err instanceof ApnsError &&
    (err.status === 410 ||
      err.reason === 'Unregistered' ||
      err.reason === 'BadDeviceToken')
  );
}
