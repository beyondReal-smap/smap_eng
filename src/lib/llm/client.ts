import OpenAI from 'openai';
import {
  LLM_PRIMARY_API_KEY,
  LLM_PRIMARY_BASE_URL,
  LLM_PRIMARY_ENABLED,
  LLM_PRIMARY_MAX_RETRIES,
  LLM_PRIMARY_MODEL,
  LLM_PRIMARY_TIMEOUT_MS,
  OPENAI_BASE_URL,
  OPENAI_MAX_RETRIES,
  OPENAI_MODEL,
  OPENAI_TIMEOUT_MS,
} from './config';

/**
 * 2계층 LLM 클라이언트 — primary(vLLM) → fallback(OpenAI).
 *
 * primary가 (네트워크/5xx/타임아웃/empty content/JSON parse fail/Zod validate fail)
 * 어느 단계든 실패하면 즉시 fallback으로 같은 요청을 재시도한다. 호출자는 분기를
 *의식하지 않으며 응답 스키마는 Zod로 검증된 T를 받는다.
 *
 * fallback 자체도 실패하면 마지막 에러를 그대로 throw — fail-fast.
 */

declare global {
  // eslint-disable-next-line no-var
  var __smapEngLLM:
    | { primary: OpenAI | null; fallback: OpenAI; primaryModel: string | null }
    | undefined;
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

function createPrimary(): OpenAI | null {
  if (!LLM_PRIMARY_ENABLED) return null;
  return new OpenAI({
    apiKey: LLM_PRIMARY_API_KEY,
    baseURL: LLM_PRIMARY_BASE_URL,
    timeout: LLM_PRIMARY_TIMEOUT_MS,
    maxRetries: LLM_PRIMARY_MAX_RETRIES,
  });
}

function createFallback(): OpenAI {
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

const state = globalThis.__smapEngLLM ?? {
  primary: createPrimary(),
  fallback: createFallback(),
  primaryModel: LLM_PRIMARY_MODEL || null,
};

if (process.env.NODE_ENV !== 'production') {
  globalThis.__smapEngLLM = state;
}

/** 외부 노출은 fallback(OpenAI) 클라이언트만 — 임베딩 등 다른 용도용. */
export const openai: OpenAI = state.fallback;

// gpt-5.2-chat-latest는 reasoning 내장 모델 — reasoning + output이
// max_completion_tokens 안에서 같이 소진된다. 동화 한 편 + reasoning을 모두
// 흡수하려면 4k는 빠듯해 finish_reason=length 사례가 있어 8k로 상향한다.
const DEFAULT_MAX_COMPLETION_TOKENS = 8000;

export interface ChatJsonOptions<T> {
  system: string;
  user: string;
  // gpt-5.2-chat-latest는 temperature=1 고정이므로 지정하면 400이 뜬다.
  // 호환 프록시·다른 모델용으로 받되, undefined면 전송하지 않는다.
  temperature?: number;
  topP?: number;
  maxCompletionTokens?: number;
  /** primary/fallback 모두에 적용되는 모델 강제. 미지정 시 각 클라이언트 기본값. */
  model?: string;
  signal?: AbortSignal;
  /**
   * 파싱된 JSON을 도메인 타입으로 검증·변환. throw하면 해당 시도가 실패로 간주되어
   * fallback이 발동한다. 미지정 시 unknown을 그대로 T로 캐스팅(검증 없음).
   */
  validate?: (raw: unknown) => T;
}

/**
 * primary 모델 ID를 lazy하게 결정. env로 강제했으면 그 값, 아니면 GET /v1/models
 * 첫 결과를 캐싱. 디스커버리 실패 시 null 반환 → 호출자는 primary skip.
 */
async function resolvePrimaryModel(client: OpenAI): Promise<string | null> {
  if (state.primaryModel) return state.primaryModel;
  try {
    const list = await client.models.list();
    const first = list.data?.[0]?.id;
    if (!first) return null;
    state.primaryModel = first;
    return first;
  } catch (err) {
    console.warn(
      `[llm] primary model discovery failed: ${(err as Error).message}`,
    );
    return null;
  }
}

interface AttemptOptions<T> {
  client: OpenAI;
  model: string;
  body: OpenAI.Chat.ChatCompletionCreateParamsNonStreaming;
  signal?: AbortSignal;
  validate?: (raw: unknown) => T;
}

/** 단일 클라이언트로 1회 시도 — 호출 + content 추출 + JSON parse + validate. */
async function attempt<T>(opts: AttemptOptions<T>): Promise<T> {
  const { client, body, signal, validate } = opts;
  let response;
  try {
    response = await client.chat.completions.create(body, { signal });
  } catch (err) {
    if (err instanceof OpenAI.APIError) {
      throw new LLMError(
        `${err.status ?? '?'} ${err.name}: ${err.message}`,
        err.status ?? undefined,
      );
    }
    throw new LLMError(err instanceof Error ? err.message : 'Unknown LLM error');
  }

  const choice = response.choices[0];
  const content = choice?.message?.content;
  if (!content) {
    // reasoning이 max_completion_tokens를 다 소진하면 content가 빈다.
    throw new LLMError(
      `empty content (finish_reason=${choice?.finish_reason ?? 'unknown'})`,
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new LLMError(
      'non-JSON despite response_format=json_object',
      undefined,
      content.slice(0, 500),
    );
  }

  if (validate) {
    try {
      return validate(parsed);
    } catch (err) {
      // Zod ZodError 등 — fallback 트리거
      throw new LLMError(
        `schema validation failed: ${(err as Error).message}`,
        undefined,
        content.slice(0, 500),
      );
    }
  }
  return parsed as T;
}

/**
 * Chat Completions JSON 출력 + Zod 검증을 primary→fallback 순으로 시도.
 *
 * primary 실패 사유는 console.warn으로 남기고, fallback도 실패하면 마지막 에러
 * 그대로 throw. primary가 비활성화(LLM_PRIMARY_BASE_URL 미설정)면 fallback만 호출.
 */
export async function chatJson<T>(opts: ChatJsonOptions<T>): Promise<T> {
  const {
    system,
    user,
    temperature,
    topP,
    maxCompletionTokens = DEFAULT_MAX_COMPLETION_TOKENS,
    model,
    signal,
    validate,
  } = opts;

  const baseBody = {
    messages: [
      { role: 'system' as const, content: system },
      { role: 'user' as const, content: user },
    ],
    response_format: { type: 'json_object' as const },
    max_completion_tokens: maxCompletionTokens,
    ...(temperature !== undefined ? { temperature } : {}),
    ...(topP !== undefined ? { top_p: topP } : {}),
  };

  // 1) primary 시도
  if (state.primary) {
    const primaryModel = model ?? (await resolvePrimaryModel(state.primary));
    if (primaryModel) {
      try {
        const result = await attempt<T>({
          client: state.primary,
          model: primaryModel,
          body: { ...baseBody, model: primaryModel },
          signal,
          validate,
        });
        console.info(`[llm] primary ok (model=${primaryModel})`);
        return result;
      } catch (err) {
        const reason = err instanceof Error ? err.message : String(err);
        console.warn(`[llm] primary failed: ${reason}; using fallback`);
      }
    } else {
      console.warn('[llm] primary model unavailable; using fallback');
    }
  }

  // 2) fallback 시도 — 실패하면 그대로 throw
  const fallbackModel = model ?? OPENAI_MODEL;
  return attempt<T>({
    client: state.fallback,
    model: fallbackModel,
    body: { ...baseBody, model: fallbackModel },
    signal,
    validate,
  });
}
