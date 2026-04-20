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

/**
 * Kokoro 서버로 텍스트를 보내고 WAV(Uint8Array)을 받아온다.
 * 실패 시 TtsError — fail-fast.
 */
export async function synthesize({
  text,
  voice = KOKORO_VOICE_DEFAULT,
  speed = 1.0,
  signal,
}: SynthesizeOptions): Promise<Uint8Array> {
  const res = await fetch(`${KOKORO_BASE_URL}/v1/tts`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ text, voice, speed }),
    signal,
  });

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
