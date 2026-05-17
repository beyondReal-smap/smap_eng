/**
 * Firebase Cloud Messaging 클라이언트.
 *
 * iOS/Android 통합 푸시 발송. 과거 `apns.ts`가 담당하던 APNs HTTP/2 직호출을 대체한다.
 *
 * 환경변수:
 *   FIREBASE_PROJECT_ID                — Firebase 콘솔의 프로젝트 ID
 *   FIREBASE_SERVICE_ACCOUNT_BASE64    — 서비스 계정 JSON을 base64로 인코딩한 값
 *
 * Service Account JSON을 그대로 .env에 넣으면 개행/따옴표 escape 문제가 잦아 base64로 보관.
 * 콘솔 → 프로젝트 설정 → 서비스 계정 → "새 비공개 키 생성"으로 발급한 JSON 전체를
 * `base64 -w 0`으로 인코딩해 환경변수에 저장한다.
 *
 * 핵심 원칙:
 *  - Firebase Admin SDK 초기화는 모듈 레벨에서 1회 (`getApps().length`로 idempotent).
 *  - 발송 실패 분류는 ApnsError 시절 의미를 보존 — `messaging/registration-token-not-registered`
 *    같은 영구 무효 에러는 `isUnregisteredError`가 true를 반환해 호출자가 토큰을 삭제하도록.
 *  - 한 디바이스 실패가 다른 디바이스 발송을 막아서는 안 된다(`send.ts`에서 Promise.allSettled).
 */

import { cert, getApps, initializeApp, type App } from 'firebase-admin/app';
import { getMessaging, type Message } from 'firebase-admin/messaging';

export class FcmError extends Error {
  constructor(
    public code: string,
    message: string,
    public registrationToken?: string,
  ) {
    super(message);
    this.name = 'FcmError';
  }
}

/** apns.ts와 시그니처 호환되는 페이로드 — send.ts의 호출처를 그대로 둘 수 있도록 유지. */
export interface FcmAlertPayload {
  title?: string;
  body: string;
  /** 딥링크 등 클라이언트 커스텀 데이터. FCM data field에 string으로만 전송 가능. */
  custom?: Record<string, unknown>;
  /** iOS 배지 카운트. 0이면 제거. */
  badge?: number;
  sound?: 'default';
}

let appCache: App | null = null;

function getFirebaseApp(): App {
  if (appCache) return appCache;

  // 다른 모듈이 이미 초기화한 경우(예: Functions 환경) 그것을 재사용.
  const existing = getApps()[0];
  if (existing) {
    appCache = existing;
    return existing;
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const credentialBase64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
  if (!projectId || !credentialBase64) {
    throw new FcmError(
      'firebase_env_missing',
      'FIREBASE_PROJECT_ID / FIREBASE_SERVICE_ACCOUNT_BASE64 환경변수가 필요합니다.',
    );
  }

  let serviceAccount: Record<string, unknown>;
  try {
    const json = Buffer.from(credentialBase64, 'base64').toString('utf8');
    serviceAccount = JSON.parse(json);
  } catch (err) {
    throw new FcmError(
      'firebase_credential_invalid',
      'FIREBASE_SERVICE_ACCOUNT_BASE64 디코딩/파싱 실패: ' + (err as Error).message,
    );
  }

  appCache = initializeApp({
    credential: cert(serviceAccount as Parameters<typeof cert>[0]),
    projectId,
  });
  return appCache;
}

/** FCM data field는 string만 허용 — number/boolean/object를 안전하게 직렬화. */
function normalizeCustom(custom?: Record<string, unknown>): Record<string, string> | undefined {
  if (!custom) return undefined;
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(custom)) {
    if (v === null || v === undefined) continue;
    out[k] = typeof v === 'string' ? v : JSON.stringify(v);
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

/**
 * 단일 디바이스에 푸시 1건 발송.
 *
 * 성공 시 resolve(). 영구 무효 토큰은 `FcmError`를 던지며 `isUnregisteredError`로 분류 가능.
 * 그 외 에러는 일반 `FcmError`(retryable 등)로 전파 — 호출자가 로그만 남기고 무시.
 */
export async function sendPushToDevice(
  registrationToken: string,
  payload: FcmAlertPayload,
): Promise<void> {
  const app = getFirebaseApp();
  const data = normalizeCustom(payload.custom);

  const message: Message = {
    token: registrationToken,
    notification: {
      title: payload.title,
      body: payload.body,
    },
    data,
    apns: {
      payload: {
        aps: {
          sound: payload.sound ?? 'default',
          badge: payload.badge,
        },
      },
    },
    android: {
      priority: 'high',
      notification: {
        sound: payload.sound ?? 'default',
        // 알림 트레이에 같은 알림이 중첩되지 않도록 tag 기본 — 필요 시 호출처가 custom 적용 가능.
        defaultSound: false,
      },
    },
  };

  try {
    await getMessaging(app).send(message);
  } catch (err) {
    const code = (err as { code?: string })?.code ?? 'unknown';
    const message = (err as Error)?.message ?? 'fcm send failed';
    throw new FcmError(code, message, registrationToken);
  }
}

/**
 * 토큰이 영구 무효인지 판별 — 호출자가 push_tokens 행을 삭제하도록.
 *
 * FCM의 영구 무효 에러 코드(Firebase Admin v13 기준):
 *   - messaging/registration-token-not-registered
 *   - messaging/invalid-registration-token
 *   - messaging/invalid-argument (잘못된 토큰 포맷)
 */
export function isUnregisteredError(err: unknown): boolean {
  if (!(err instanceof FcmError)) return false;
  return (
    err.code === 'messaging/registration-token-not-registered' ||
    err.code === 'messaging/invalid-registration-token' ||
    err.code === 'messaging/invalid-argument'
  );
}
