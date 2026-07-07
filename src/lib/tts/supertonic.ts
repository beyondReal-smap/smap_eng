// Supertonic TTS 프록시 — services/tts/ FastAPI 서버를 호출한다.
// 오픈모델 원칙 유지: 로컬 Python 서버(99M ONNX)만 허용.

const SUPERTONIC_BASE_URL =
  process.env.SUPERTONIC_BASE_URL ?? 'http://localhost:8880';

// Supertonic voice id: F1/F2/F3/F4/F5(여성), M1/M2/M3/M4/M5(남성).
const SUPERTONIC_VOICE_DEFAULT = process.env.SUPERTONIC_VOICE ?? 'F1';

// 어린이 학습용 기본 발화 속도. 합성 단계에서 약간 느리게 만든다(클라이언트
// playbackRate 0.75와 누적되어 최종 재생 속도가 결정됨). Supertonic 허용 범위
// 0.7~2.0 안에서만 적용하고, 잘못된 env는 기본값으로 안전 폴백.
const SUPERTONIC_SPEED_DEFAULT = (() => {
  const raw = process.env.SUPERTONIC_SPEED;
  if (!raw) return 0.85;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0.7 || n > 2.0) return 0.85;
  return n;
})();

// 합성 상한 타임아웃. FastAPI/모델이 hang하면 on-demand 라우트는 사용자 핸들러를,
// 배치는 inFlightBooks 락을 장시간 점유한다. undici 기본 상한(~5분)은 UX 저하라
// 명시적으로 짧게 끊는다. 잘못된 env는 기본값으로 안전 폴백.
const SUPERTONIC_TIMEOUT_MS = (() => {
  const raw = process.env.SUPERTONIC_TIMEOUT_MS;
  if (!raw) return 60_000;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return 60_000;
  return n;
})();

export class TtsError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = 'TtsError';
  }
}

export interface SynthesizeOptions {
  text: string;
  voice?: string; // Supertonic voice id (예: F1, F2, M1, M2)
  speed?: number; // 0.7 ~ 2.0
  signal?: AbortSignal;
}

// Supertonic 서비스가 PM2 reload·OOM·max_memory_restart로 graceful 재시작 중이면
// fetch가 ECONNREFUSED(또는 timeout)를 던진다. 실제 재기동 시간은 모델 로드 포함
// ~3-5초 — 1회 짧은 backoff로 재시도하면 사용자 노출을 막을 수 있다.
const NETWORK_RETRY_DELAY_MS = 1500;
const NETWORK_RETRY_MAX = 1;

function isTransientFetchError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const cause = (err as { cause?: { code?: string } }).cause;
  const code = cause?.code;
  return (
    code === 'ECONNREFUSED' ||
    code === 'ECONNRESET' ||
    code === 'ETIMEDOUT' ||
    code === 'UND_ERR_SOCKET' ||
    code === 'UND_ERR_CONNECT_TIMEOUT'
  );
}

/**
 * Supertonic 서버로 텍스트를 보내고 오디오 바이트(Uint8Array, 현재 MP3)를 받아온다.
 * 네트워크/HTTP 실패 모두 TtsError로 정규화 — 라우트 경계에서 502로 매핑된다.
 * Transient 네트워크 에러는 1회 재시도(서비스 reload 윈도우 흡수).
 */
export async function synthesize({
  text,
  voice = SUPERTONIC_VOICE_DEFAULT,
  speed = SUPERTONIC_SPEED_DEFAULT,
  signal,
}: SynthesizeOptions): Promise<Uint8Array> {
  let attempt = 0;
  while (true) {
    // 매 시도마다 새 타임아웃. 외부 취소 signal과 합성해 둘 중 먼저 발화하는 쪽이 abort.
    const timeoutSignal = AbortSignal.timeout(SUPERTONIC_TIMEOUT_MS);
    const fetchSignal = signal
      ? AbortSignal.any([signal, timeoutSignal])
      : timeoutSignal;
    let res: Response;
    try {
      res = await fetch(`${SUPERTONIC_BASE_URL}/v1/tts`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ text, voice, speed }),
        signal: fetchSignal,
      });
    } catch (err) {
      // 외부 AbortSignal(사용자 취소) 발화는 호출자에 그대로 전달.
      if (signal?.aborted) throw err;
      // 내부 타임아웃 — hang은 재시도해도 또 hang이므로 즉시 TtsError로 끊는다.
      if (timeoutSignal.aborted) {
        throw new TtsError(
          `Supertonic timeout after ${SUPERTONIC_TIMEOUT_MS}ms`,
        );
      }
      if (attempt < NETWORK_RETRY_MAX && isTransientFetchError(err)) {
        attempt += 1;
        await new Promise((r) => setTimeout(r, NETWORK_RETRY_DELAY_MS));
        continue;
      }
      const cause = (err as { cause?: { code?: string } }).cause;
      throw new TtsError(
        `Supertonic unreachable (${cause?.code ?? 'fetch_failed'}): ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new TtsError(
        `Supertonic ${res.status} ${res.statusText} ${body.slice(0, 200)}`,
        res.status,
      );
    }

    const buf = await res.arrayBuffer();
    return new Uint8Array(buf);
  }
}

/** 서버 상태 확인용. */
export async function tts_health(): Promise<boolean> {
  try {
    const res = await fetch(`${SUPERTONIC_BASE_URL}/health`, {
      signal: AbortSignal.timeout(2000),
    });
    return res.ok;
  } catch {
    return false;
  }
}
