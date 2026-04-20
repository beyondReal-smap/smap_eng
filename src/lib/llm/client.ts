import OpenAI from 'openai';
import {
  OPENAI_BASE_URL,
  OPENAI_MAX_RETRIES,
  OPENAI_MODEL,
  OPENAI_TIMEOUT_MS,
} from './config';

declare global {
  // eslint-disable-next-line no-var
  var __smapEngOpenAI: OpenAI | undefined;
}

function createClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new LLMError(
      'OPENAI_API_KEY is not set. Add it to .env.local (never commit).',
    );
  }
  return new OpenAI({
    apiKey,
    baseURL: OPENAI_BASE_URL,
    timeout: OPENAI_TIMEOUT_MS,
    maxRetries: OPENAI_MAX_RETRIES,
  });
}

// 앱 수명주기 싱글톤 — Next.js HMR 중복 생성 방지
export const openai: OpenAI =
  globalThis.__smapEngOpenAI ?? createClient();

if (process.env.NODE_ENV !== 'production') {
  globalThis.__smapEngOpenAI = openai;
}

// gpt-5.2-chat-latest는 reasoning 내장 모델 — reasoning + output이
// max_completion_tokens 안에서 같이 소진된다. 동화(20 passage × 15 word ≈
// 600 token) + reasoning 여유까지 고려해 4000을 기본값으로 둔다.
const DEFAULT_MAX_COMPLETION_TOKENS = 4000;

export interface ChatJsonOptions {
  system: string;
  user: string;
  // gpt-5.2-chat-latest는 temperature=1 고정이므로 지정하면 400이 뜬다.
  // 호환 프록시·다른 모델용으로 받되, undefined면 전송하지 않는다.
  temperature?: number;
  topP?: number;
  maxCompletionTokens?: number;
  model?: string;
  signal?: AbortSignal;
}

export class LLMError extends Error {
  readonly status?: number;
  readonly raw?: string;

  constructor(message: string, status?: number, raw?: string) {
    super(message);
    this.name = 'LLMError';
    this.status = status;
    this.raw = raw;
  }
}

/**
 * Chat Completions 엔드포인트로 JSON 구조화 출력 강제.
 * 응답을 JSON.parse까지 수행하고 T로 반환 — fail-fast 원칙.
 */
export async function chatJson<T>(opts: ChatJsonOptions): Promise<T> {
  const {
    system,
    user,
    temperature,
    topP,
    maxCompletionTokens = DEFAULT_MAX_COMPLETION_TOKENS,
    model = OPENAI_MODEL,
    signal,
  } = opts;

  const body: OpenAI.Chat.ChatCompletionCreateParamsNonStreaming = {
    model,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    response_format: { type: 'json_object' },
    max_completion_tokens: maxCompletionTokens,
  };
  if (temperature !== undefined) body.temperature = temperature;
  if (topP !== undefined) body.top_p = topP;

  let response;
  try {
    response = await openai.chat.completions.create(body, { signal });
  } catch (err) {
    if (err instanceof OpenAI.APIError) {
      throw new LLMError(
        `OpenAI ${err.status ?? '?'} ${err.name}: ${err.message}`,
        err.status ?? undefined,
      );
    }
    throw new LLMError(
      err instanceof Error ? err.message : 'Unknown LLM error',
    );
  }

  const choice = response.choices[0];
  const content = choice?.message?.content;
  if (!content) {
    // 내부 reasoning이 max_completion_tokens를 다 소진하면 content가 빈다.
    throw new LLMError(
      `OpenAI returned empty content (finish_reason=${choice?.finish_reason ?? 'unknown'}). ` +
        `Increase maxCompletionTokens if needed.`,
    );
  }

  try {
    return JSON.parse(content) as T;
  } catch {
    throw new LLMError(
      'OpenAI returned non-JSON despite response_format=json_object',
      undefined,
      content.slice(0, 500),
    );
  }
}
