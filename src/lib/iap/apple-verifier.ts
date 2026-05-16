/**
 * Apple StoreKit 2 JWS Transaction 검증.
 *
 * iOS가 보낸 `Transaction.jwsRepresentation` (ES256 JWS)을 받아:
 *   1. JWS 헤더의 x5c 인증서 체인을 파싱
 *   2. 체인 검증: leaf → intermediate → root 서명 + 유효기간
 *   3. root가 임베드된 Apple Root CA G3와 동일한지 fingerprint 비교
 *   4. leaf의 public key로 JWS payload signature 검증
 *   5. payload 디코드 + bundleId/exp/productId 검증
 *
 * 외부 라이브러리 없이 Node.js 내장 crypto + X509Certificate API만 사용.
 * Apple App Store Server API의 "decodeNotification" 흐름과 동일한 검증 로직.
 */

import { X509Certificate, createVerify } from 'node:crypto';

// Apple Root CA G3 — StoreKit JWS 인증서 체인의 최상위 CA.
// 출처: https://www.apple.com/certificateauthority/
// SHA-256 fingerprint: 63 34 3A BF B8 9A 6A 03 EB B5 7E 9B 3F 5F A7 BE 7C 4F 5C 75 6F 30 17 B3 A8 C4 88 C3 65 3E 91 79
const APPLE_ROOT_CA_G3_PEM = `-----BEGIN CERTIFICATE-----
MIICQzCCAcmgAwIBAgIILcX8iNLFS5UwCgYIKoZIzj0EAwMwZzEbMBkGA1UEAwwS
QXBwbGUgUm9vdCBDQSAtIEczMSYwJAYDVQQLDB1BcHBsZSBDZXJ0aWZpY2F0aW9u
IEF1dGhvcml0eTETMBEGA1UECgwKQXBwbGUgSW5jLjELMAkGA1UEBhMCVVMwHhcN
MTQwNDMwMTgxOTA2WhcNMzkwNDMwMTgxOTA2WjBnMRswGQYDVQQDDBJBcHBsZSBS
b290IENBIC0gRzMxJjAkBgNVBAsMHUFwcGxlIENlcnRpZmljYXRpb24gQXV0aG9y
aXR5MRMwEQYDVQQKDApBcHBsZSBJbmMuMQswCQYDVQQGEwJVUzB2MBAGByqGSM49
AgEGBSuBBAAiA2IABJjpLz1AcqTtkyJygRMc3RCV8cWjTnHcFBbZDuWmBSp3ZHtf
TjjTuxxEtX/1H7YyYl3J6YRbTzBPEVoA/VhYDKX1DyxNB0cTddqXl5dvMVztK517
IDvYuVTZXpmkOlEKMaNCMEAwHQYDVR0OBBYEFLuw3qFYM4iapIqZ3r6966/ayySr
MA8GA1UdEwEB/wQFMAMBAf8wDgYDVR0PAQH/BAQDAgEGMAoGCCqGSM49BAMDA2gA
MGUCMQCD6cHEFl4aXTQY2e3v9GwOAEZLuN+yRhHFD/3meoyhpmvOwgPUnPWTxnS4
at+qIxUCMG1mihDK1A3UT82NQz60imOlM27jbdoXt2QfyFMm+YhidDkLF1vLUagM
6BgD56KyKA==
-----END CERTIFICATE-----`;

const APPLE_ROOT_CA_G3 = new X509Certificate(APPLE_ROOT_CA_G3_PEM);

export class AppleIapError extends Error {
  constructor(public code: string, message?: string) {
    super(message ?? code);
    this.name = 'AppleIapError';
  }
}

/** App Store가 보내는 transaction JWS payload — 핵심 필드만 정의. */
export interface JwsTransactionPayload {
  /** StoreKit 2 transactionId (영수증 단위 unique). */
  transactionId: string;
  /** 최초 구매 트랜잭션 — 구독 갱신 시 변하지 않음. Consumable에선 transactionId와 동일. */
  originalTransactionId: string;
  /** iOS Product ID. */
  productId: string;
  /** Bundle Identifier — 우리 앱 식별. */
  bundleId: string;
  /** epoch ms — 거래 시각. */
  signedDate: number;
  /** epoch ms — 구매 시각. */
  purchaseDate: number;
  /** "Production" | "Sandbox". */
  environment: 'Production' | 'Sandbox';
  /** 'Consumable' | 'NonConsumable' | 'AutoRenewable' | 'NonRenewable'. */
  type?: string;
  /** Consumable 외의 종류에서 사용. */
  revocationDate?: number;
  /** RevocationReason 코드. */
  revocationReason?: number;
}

function base64UrlToBuffer(b64url: string): Buffer {
  const padded =
    b64url.replace(/-/g, '+').replace(/_/g, '/') +
    '=='.slice((b64url.length + 2) % 4);
  return Buffer.from(padded, 'base64');
}

function derFromX5cEntry(b64: string): Buffer {
  // x5c 엔트리는 표준 base64(패딩 포함, URL-safe 아님).
  return Buffer.from(b64, 'base64');
}

function certFromDer(der: Buffer): X509Certificate {
  return new X509Certificate(der);
}

/**
 * ES256 JWS의 서명(raw r||s 64바이트)을 DER 인코딩 ECDSA로 변환.
 * Node.js crypto.verify에 dsaEncoding 옵션 대신 직접 DER 변환을 쓰는 이유는,
 * dsaEncoding이 OpenSSL 빌드별로 동작 차이가 있어 안정성을 위해 명시적으로 변환.
 */
function jwsEcdsaSigToDer(sig: Buffer): Buffer {
  if (sig.length !== 64) {
    throw new AppleIapError('invalid_signature_length', `${sig.length}`);
  }
  const r = sig.subarray(0, 32);
  const s = sig.subarray(32, 64);

  function trimLeadingZeros(buf: Buffer): Buffer {
    let i = 0;
    while (i < buf.length - 1 && buf[i] === 0) i++;
    return buf.subarray(i);
  }
  function encodeInteger(buf: Buffer): Buffer {
    let v = trimLeadingZeros(buf);
    // 최상위 비트가 1이면 부호 비트 회피용 0x00 prepend.
    if (v[0] >= 0x80) v = Buffer.concat([Buffer.from([0x00]), v]);
    return Buffer.concat([Buffer.from([0x02, v.length]), v]);
  }
  const rEnc = encodeInteger(r);
  const sEnc = encodeInteger(s);
  const seqLen = rEnc.length + sEnc.length;
  return Buffer.concat([Buffer.from([0x30, seqLen]), rEnc, sEnc]);
}

function certIsCurrentlyValid(cert: X509Certificate, now: Date): boolean {
  const notBefore = new Date(cert.validFrom);
  const notAfter = new Date(cert.validTo);
  return now >= notBefore && now <= notAfter;
}

/**
 * 인증서 체인 검증 — leaf → intermediate → root.
 * root는 임베드된 Apple Root CA G3와 fingerprint(SHA-256) 일치해야 한다.
 * 각 단계: child가 parent의 public key로 서명되었는지 확인.
 */
function verifyChain(chain: X509Certificate[], now: Date): X509Certificate {
  if (chain.length < 2) {
    throw new AppleIapError('chain_too_short', `${chain.length}`);
  }
  for (const cert of chain) {
    if (!certIsCurrentlyValid(cert, now)) {
      throw new AppleIapError('cert_expired_or_not_yet_valid');
    }
  }

  // child[i].verify(parent[i+1].publicKey) — 마지막은 root 자체 서명.
  for (let i = 0; i < chain.length - 1; i++) {
    const child = chain[i];
    const parent = chain[i + 1];
    if (!child.verify(parent.publicKey)) {
      throw new AppleIapError('chain_signature_invalid', `i=${i}`);
    }
  }

  const root = chain[chain.length - 1];
  if (root.fingerprint256 !== APPLE_ROOT_CA_G3.fingerprint256) {
    throw new AppleIapError(
      'untrusted_root',
      `expected=${APPLE_ROOT_CA_G3.fingerprint256} got=${root.fingerprint256}`,
    );
  }
  // root self-signed 확인은 임베드된 root와 fingerprint 일치 시점에 보장됨.

  // leaf 반환 — payload 서명 검증에 사용.
  return chain[0];
}

/**
 * Apple JWS(ES256, x5c chain) 토큰의 인증서 체인 + 서명을 검증하고 payload만 반환.
 * Transaction JWS와 Server Notification JWS 둘 다 같은 ES256+x5c 포맷이라 공통 로직으로 분리.
 * Domain 검증(bundleId / productId / revocation 등)은 호출자가 payload를 받아 직접 수행.
 */
export async function verifyAppleSignedJws<T>(jws: string): Promise<T> {
  const parts = jws.split('.');
  if (parts.length !== 3) {
    throw new AppleIapError('invalid_jws', 'expected 3 parts');
  }
  const [headerB64, payloadB64, signatureB64] = parts;

  let header: { alg: string; x5c?: string[] };
  let payload: T;
  try {
    header = JSON.parse(base64UrlToBuffer(headerB64).toString('utf8'));
    payload = JSON.parse(base64UrlToBuffer(payloadB64).toString('utf8'));
  } catch {
    throw new AppleIapError('malformed_jws', 'header/payload parse');
  }

  if (header.alg !== 'ES256') {
    throw new AppleIapError('unsupported_alg', header.alg);
  }
  if (!Array.isArray(header.x5c) || header.x5c.length < 2) {
    throw new AppleIapError('missing_x5c');
  }

  const now = new Date();
  const chain = header.x5c.map((b64) => certFromDer(derFromX5cEntry(b64)));
  const leaf = verifyChain(chain, now);

  const signedBytes = Buffer.from(`${headerB64}.${payloadB64}`, 'ascii');
  const sigRaw = base64UrlToBuffer(signatureB64);
  const sigDer = jwsEcdsaSigToDer(sigRaw);

  const verifier = createVerify('SHA256');
  verifier.update(signedBytes);
  verifier.end();
  const valid = verifier.verify(leaf.publicKey, sigDer);
  if (!valid) {
    throw new AppleIapError('payload_signature_invalid');
  }

  return payload;
}

/**
 * Apple StoreKit 2 JWS transaction 토큰을 검증하고 payload 반환.
 * 신규 구매(verify) 경로 — revoked 거래는 차단한다.
 *
 * @param jws — `Transaction.jwsRepresentation` 문자열
 * @param expectedBundleId — 우리 앱 번들 ID (`site.smap.harubook.ios`)
 */
export async function verifyAppleTransactionJws(
  jws: string,
  expectedBundleId: string,
): Promise<JwsTransactionPayload> {
  const payload = await verifyAppleSignedJws<JwsTransactionPayload>(jws);

  if (payload.bundleId !== expectedBundleId) {
    throw new AppleIapError('invalid_bundle_id', payload.bundleId);
  }
  if (payload.environment !== 'Production' && payload.environment !== 'Sandbox') {
    throw new AppleIapError('invalid_environment', payload.environment);
  }
  if (!payload.transactionId || !payload.productId) {
    throw new AppleIapError('missing_payload_fields');
  }
  if (payload.revocationDate) {
    throw new AppleIapError('revoked_transaction', `${payload.revocationDate}`);
  }

  return payload;
}

/**
 * 서버 알림 안에 포함된 transaction info를 검증한다. REFUND notification은 정의상
 * revocationDate가 있어 `verifyAppleTransactionJws`로는 통과하지 않으므로 별도 변형.
 */
export async function verifyNotificationTransactionInfo(
  jws: string,
  expectedBundleId: string,
): Promise<JwsTransactionPayload> {
  const payload = await verifyAppleSignedJws<JwsTransactionPayload>(jws);
  if (payload.bundleId !== expectedBundleId) {
    throw new AppleIapError('invalid_bundle_id', payload.bundleId);
  }
  if (!payload.transactionId || !payload.productId) {
    throw new AppleIapError('missing_payload_fields');
  }
  return payload;
}
