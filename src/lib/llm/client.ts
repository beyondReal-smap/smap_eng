import { OLLAMA_BASE_URL, OLLAMA_MODEL } from './config';

type OllamaRole = 'system' | 'user' | 'assistant';

interface OllamaMessage {
  role: OllamaRole;
  content: string;
}

interface OllamaChatOptions {
  messages: OllamaMessage[];
  model?: string;
  temperature?: number;
  topP?: number;
  // Ollama는 format: 'json' 또는 JSON schema 객체를 받아 구조화 출력을 강제할 수 있다
  format?: 'json' | Record<string, unknown>;
  // 타임아웃(ms). 기본 5분 — 동화/퀴즈 생성이 길어질 수 있어 넉넉하게
  timeoutMs?: number;
}

interface OllamaChatResponse {
  message: { role: OllamaRole; content: string };
  done: boolean;
  total_duration?: number;
  eval_count?: number;
}

export class OllamaError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    readonly raw?: string,
  ) {
    super(message);
    this.name = 'OllamaError';
  }
}

/**
 * Ollama `/api/chat` 호출 — 스트리밍 없이 한 번에 응답.
 * 상용 API 금지 원칙에 따라 Ollama에 직접 fetch. SDK 미사용.
 */
export async function ollamaChat({
  messages,
  model = OLLAMA_MODEL,
  temperature = 0.8,
  topP = 0.9,
  format,
  timeoutMs = 5 * 60 * 1000,
}: OllamaChatOptions): Promise<OllamaChatResponse> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        model,
        messages,
        stream: false,
        format,
        options: { temperature, top_p: topP },
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const body = await res.text();
      throw new OllamaError(
        `Ollama chat failed: ${res.status} ${res.statusText}`,
        res.status,
        body,
      );
    }

    return (await res.json()) as OllamaChatResponse;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * JSON 구조화 출력을 강제하고, 파싱까지 수행한다.
 * 실패 시 OllamaError를 던진다 — fail-fast 원칙.
 */
export async function ollamaChatJson<T>({
  messages,
  model,
  temperature,
  topP,
  timeoutMs,
}: Omit<OllamaChatOptions, 'format'>): Promise<T> {
  const response = await ollamaChat({
    messages,
    model,
    temperature,
    topP,
    format: 'json',
    timeoutMs,
  });

  const content = response.message.content.trim();
  try {
    return JSON.parse(content) as T;
  } catch (err) {
    throw new OllamaError(
      `Ollama returned non-JSON content despite format=json`,
      undefined,
      content,
    );
  }
}
