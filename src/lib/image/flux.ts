// FLUX.1-schnell 프록시 — services/image/ FastAPI 서버를 호출한다.
// 오픈모델 원칙 유지: 로컬 Diffusers(PyTorch CPU) Python 서버.

const FLUX_BASE_URL = process.env.FLUX_BASE_URL ?? 'http://localhost:8890';

// FLUX CPU 추론은 수십 초가 걸린다. 워커 과부하/데드락 시 동기 사용자 POST가
// 장시간 대기하지 않도록 상한 타임아웃을 둔다. 잘못된 env는 기본값으로 안전 폴백.
const FLUX_TIMEOUT_MS = (() => {
  const raw = process.env.FLUX_TIMEOUT_MS;
  if (!raw) return 90_000;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return 90_000;
  return n;
})();

export class ImageError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = 'ImageError';
  }
}

export interface GenerateImageOptions {
  prompt: string;
  width?: number; // 기본 1024
  height?: number; // 기본 768
  steps?: number; // schnell 권장 1~4
  seed?: number;
  guidance?: number;
  signal?: AbortSignal;
}

export async function generateImage({
  prompt,
  width = 1024,
  height = 768,
  steps = 4,
  seed,
  guidance = 3.5,
  signal,
}: GenerateImageOptions): Promise<Uint8Array> {
  // 외부 취소 signal과 내부 타임아웃을 합성 — 먼저 발화하는 쪽이 fetch를 abort.
  const timeoutSignal = AbortSignal.timeout(FLUX_TIMEOUT_MS);
  const fetchSignal = signal
    ? AbortSignal.any([signal, timeoutSignal])
    : timeoutSignal;
  let res: Response;
  try {
    res = await fetch(`${FLUX_BASE_URL}/v1/image`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ prompt, width, height, steps, seed, guidance }),
      signal: fetchSignal,
    });
  } catch (err) {
    // 외부 취소는 호출자에 그대로 전달, 내부 타임아웃·네트워크 실패는 ImageError로 정규화.
    if (signal?.aborted) throw err;
    if (timeoutSignal.aborted) {
      throw new ImageError(`FLUX timeout after ${FLUX_TIMEOUT_MS}ms`);
    }
    throw new ImageError(
      `FLUX unreachable: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new ImageError(
      `FLUX ${res.status} ${res.statusText} ${body.slice(0, 200)}`,
      res.status,
    );
  }

  const buf = await res.arrayBuffer();
  return new Uint8Array(buf);
}

export async function image_health(): Promise<boolean> {
  try {
    const res = await fetch(`${FLUX_BASE_URL}/health`, {
      signal: AbortSignal.timeout(2000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** 아동 동화 표지용 스타일 프리셋 프롬프트 빌더. */
export function buildCoverPrompt(title: string, topic?: string): string {
  const base = topic ? `${title}. ${topic}.` : title;
  return (
    `Children's storybook cover illustration: ${base} ` +
    `Soft pastel colors, warm lighting, cute friendly characters, ` +
    `hand-drawn watercolor style, whimsical, cozy atmosphere, ` +
    `safe for kids, no text, no letters.`
  );
}

/** 장면 삽화용 프롬프트 빌더. */
export function buildSceneprompt(
  englishSentence: string,
  bookTopic?: string,
): string {
  const ctx = bookTopic ? `Story about: ${bookTopic}. ` : '';
  return (
    `Children's storybook illustration. ${ctx}` +
    `Scene: "${englishSentence}" ` +
    `Gentle watercolor style, soft pastel colors, cute expressive characters, ` +
    `warm lighting, whimsical, safe for kids, no text.`
  );
}
