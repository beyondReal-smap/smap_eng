// Kokoro TTS 프록시 — services/tts/ FastAPI 서버를 호출한다.
// 오픈모델 원칙 유지: 로컬 Python 서버만 허용.

const KOKORO_BASE_URL =
  process.env.KOKORO_BASE_URL ?? 'http://localhost:8880';

const KOKORO_VOICE_DEFAULT = process.env.KOKORO_VOICE ?? 'af_heart';

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
  voice?: string; // Kokoro voice id (예: af_heart, af_bella, am_adam)
  speed?: number; // 0.5 ~ 2.0
  signal?: AbortSignal;
}

// Kokoro 서비스가 PM2 reload·OOM·max_memory_restart로 graceful 재시작 중이면
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
 * Kokoro 서버로 텍스트를 보내고 WAV(Uint8Array)을 받아온다.
 * 네트워크/HTTP 실패 모두 TtsError로 정규화 — 라우트 경계에서 502로 매핑된다.
 * Transient 네트워크 에러는 1회 재시도(서비스 reload 윈도우 흡수).
 */
export async function synthesize({
  text,
  voice = KOKORO_VOICE_DEFAULT,
  speed = 1.0,
  signal,
}: SynthesizeOptions): Promise<Uint8Array> {
  let attempt = 0;
  while (true) {
    let res: Response;
    try {
      res = await fetch(`${KOKORO_BASE_URL}/v1/tts`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ text, voice, speed }),
        signal,
      });
    } catch (err) {
      // AbortSignal 발화는 호출자에 그대로 전달.
      if (signal?.aborted) throw err;
      if (attempt < NETWORK_RETRY_MAX && isTransientFetchError(err)) {
        attempt += 1;
        await new Promise((r) => setTimeout(r, NETWORK_RETRY_DELAY_MS));
        continue;
      }
      const cause = (err as { cause?: { code?: string } }).cause;
      throw new TtsError(
        `Kokoro unreachable (${cause?.code ?? 'fetch_failed'}): ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new TtsError(
        `Kokoro ${res.status} ${res.statusText} ${body.slice(0, 200)}`,
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
    const res = await fetch(`${KOKORO_BASE_URL}/health`, {
      signal: AbortSignal.timeout(2000),
    });
    return res.ok;
  } catch {
    return false;
  }
}
