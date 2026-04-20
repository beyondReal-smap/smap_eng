// FLUX.1-schnell 프록시 — services/image/ FastAPI 서버를 호출한다.
// 오픈모델 원칙 유지: 로컬 MLX Python 서버만 허용.

const FLUX_BASE_URL = process.env.FLUX_BASE_URL ?? 'http://localhost:8890';

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
  const res = await fetch(`${FLUX_BASE_URL}/v1/image`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ prompt, width, height, steps, seed, guidance }),
    signal,
  });

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
