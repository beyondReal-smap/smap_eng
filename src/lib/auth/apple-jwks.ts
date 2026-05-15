/**
 * Apple Sign In identityToken (JWT) 서명 검증.
 *
 * 외부 라이브러리(jose, jsonwebtoken) 없이 Node.js 내장 crypto만 사용한다.
 * JWKS 캐시 TTL 1시간 — Apple 키 회전 주기에 맞춰 보수적으로 설정.
 *
 * 검증 항목:
 *   - JWT 서명 (RS256, kid → JWKS 매칭 공개키)
 *   - issuer = `https://appleid.apple.com`
 *   - audience = `APPLE_SIGN_IN_CLIENT_ID` (= bundle identifier)
 *   - exp > now
 *   - nonce_supported && payload.nonce_hash === sha256(client nonce) — 호출자가 검증
 */

import { createPublicKey, createVerify, createHash } from 'node:crypto';

const APPLE_JWKS_URL = 'https://appleid.apple.com/auth/keys';
const APPLE_ISSUER = 'https://appleid.apple.com';
const JWKS_TTL_MS = 60 * 60 * 1000; // 1h

interface JwkKey {
  kid: string;
  kty: string;
  alg: string;
  use: string;
  n: string; // base64url modulus
  e: string; // base64url exponent
}

interface JwksCache {
  keys: JwkKey[];
  fetchedAt: number;
}

let cache: JwksCache | null = null;
let inFlight: Promise<JwksCache> | null = null;

async function fetchJwks(): Promise<JwksCache> {
  const res = await fetch(APPLE_JWKS_URL, {
    headers: { accept: 'application/json' },
    // 캐시는 모듈 레벨에서 관리. HTTP 캐시는 무시.
    cache: 'no-store',
  });
  if (!res.ok) {
    throw new AppleJwksError('jwks_fetch_failed', `${res.status}`);
  }
  const body = (await res.json()) as { keys: JwkKey[] };
  if (!body || !Array.isArray(body.keys)) {
    throw new AppleJwksError('jwks_malformed', 'no keys');
  }
  return { keys: body.keys, fetchedAt: Date.now() };
}

async function getJwks(): Promise<JwksCache> {
  if (cache && Date.now() - cache.fetchedAt < JWKS_TTL_MS) {
    return cache;
  }
  if (inFlight) return inFlight;
  inFlight = (async () => {
    try {
      const fresh = await fetchJwks();
      cache = fresh;
      return fresh;
    } finally {
      inFlight = null;
    }
  })();
  return inFlight;
}

function base64UrlToBuffer(b64url: string): Buffer {
  const padded = b64url.replace(/-/g, '+').replace(/_/g, '/') + '=='.slice(
    (b64url.length + 2) % 4,
  );
  return Buffer.from(padded, 'base64');
}

function jwkToPem(key: JwkKey): string {
  const keyObject = createPublicKey({
    key: {
      kty: key.kty,
      n: key.n,
      e: key.e,
    },
    format: 'jwk',
  });
  return keyObject.export({ type: 'spki', format: 'pem' }).toString();
}

export interface AppleIdentityClaims {
  /** Apple user ID — 영구. users.accounts.providerAccountId로 매핑. */
  sub: string;
  /** 사용자 이메일 (relay or 실제). 누락 가능. */
  email?: string;
  /** Apple이 이메일을 검증했는가 (string "true"/"false" 또는 boolean). */
  email_verified?: boolean | string;
  /** "이메일 숨기기" 사용 시 true. */
  is_private_email?: boolean | string;
  /** issuer */
  iss: string;
  /** audience (client_id) */
  aud: string;
  /** issued at */
  iat: number;
  /** expires at */
  exp: number;
  /** SHA256(client nonce) base64url — 호출자가 검증. */
  nonce?: string;
}

export class AppleJwksError extends Error {
  constructor(public code: string, message?: string) {
    super(message ?? code);
    this.name = 'AppleJwksError';
  }
}

/**
 * Apple identityToken (RS256 JWT)을 검증하고 claims 반환.
 *
 * @param identityToken — iOS가 `ASAuthorizationAppleIDCredential.identityToken`에서 받은 JWT
 * @param expectedAudience — bundle identifier (APPLE_SIGN_IN_CLIENT_ID)
 * @param expectedNonce — iOS에서 보낸 raw nonce. 옵션. 있으면 SHA256 후 payload.nonce와 비교.
 */
export async function verifyAppleIdentityToken(
  identityToken: string,
  expectedAudience: string,
  expectedNonce?: string,
): Promise<AppleIdentityClaims> {
  const parts = identityToken.split('.');
  if (parts.length !== 3) {
    throw new AppleJwksError('invalid_jwt', 'expected 3 parts');
  }
  const [headerB64, payloadB64, signatureB64] = parts;

  let header: { alg: string; kid: string };
  let payload: AppleIdentityClaims;
  try {
    header = JSON.parse(base64UrlToBuffer(headerB64).toString('utf8'));
    payload = JSON.parse(base64UrlToBuffer(payloadB64).toString('utf8'));
  } catch {
    throw new AppleJwksError('invalid_jwt', 'malformed header/payload');
  }

  if (header.alg !== 'RS256') {
    throw new AppleJwksError('unsupported_alg', header.alg);
  }
  if (!header.kid) {
    throw new AppleJwksError('missing_kid');
  }

  const jwks = await getJwks();
  let jwk = jwks.keys.find((k) => k.kid === header.kid);
  if (!jwk) {
    // 키 회전 직후일 수 있음 — 캐시 무효화 후 재시도 1회.
    cache = null;
    const refreshed = await getJwks();
    jwk = refreshed.keys.find((k) => k.kid === header.kid);
    if (!jwk) {
      throw new AppleJwksError('kid_not_found', header.kid);
    }
  }

  const pem = jwkToPem(jwk);
  const verifier = createVerify('RSA-SHA256');
  verifier.update(`${headerB64}.${payloadB64}`);
  verifier.end();
  const signature = base64UrlToBuffer(signatureB64);
  const ok = verifier.verify(pem, signature);
  if (!ok) {
    throw new AppleJwksError('invalid_signature');
  }

  if (payload.iss !== APPLE_ISSUER) {
    throw new AppleJwksError('invalid_issuer', payload.iss);
  }
  if (payload.aud !== expectedAudience) {
    throw new AppleJwksError('invalid_audience', payload.aud);
  }
  const nowSec = Math.floor(Date.now() / 1000);
  if (typeof payload.exp !== 'number' || payload.exp <= nowSec) {
    throw new AppleJwksError('expired');
  }

  if (expectedNonce) {
    // iOS 표준 SiwA 구현: raw nonce를 SHA256 hex로 계산하여 Apple Request에 전달.
    // Apple은 그 hex 문자열을 JWT payload.nonce에 그대로 넣는다.
    const expectedHash = createHash('sha256')
      .update(expectedNonce)
      .digest('hex');
    if (payload.nonce !== expectedHash) {
      throw new AppleJwksError('invalid_nonce');
    }
  }

  return payload;
}
