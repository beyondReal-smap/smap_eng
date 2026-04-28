// LLM 클라이언트 설정
// API 키는 환경변수로만 전달 — 절대 하드코딩/커밋 금지
//
// 2계층 구조:
//   1차(primary): 자체 vLLM 엔드포인트 (LLM_PRIMARY_*) — 비용/지연 최적
//   2차(fallback): OpenAI Chat Completions (OPENAI_*) — primary 실패 시 자동 폴백
//
// primary가 미설정이면 OpenAI만 단독 호출.

export const OPENAI_MODEL =
  process.env.OPENAI_MODEL ?? 'gpt-5.2-chat-latest';

export const OPENAI_TIMEOUT_MS = Number(
  process.env.OPENAI_TIMEOUT_MS ?? 60_000,
);

export const OPENAI_MAX_RETRIES = Number(
  process.env.OPENAI_MAX_RETRIES ?? 3,
);

// OPENAI_BASE_URL은 선택 — OpenAI 호환 프록시(Azure/LiteLLM 등) 지정 시에만 사용
export const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL || undefined;

// ---------- vLLM(primary) 설정 ----------

/** vLLM OpenAI 호환 엔드포인트. 비어있으면 primary 비활성화. */
export const LLM_PRIMARY_BASE_URL = process.env.LLM_PRIMARY_BASE_URL || '';

/** vLLM은 키 검증을 안 하지만 OpenAI SDK는 키를 요구하므로 placeholder. */
export const LLM_PRIMARY_API_KEY =
  process.env.LLM_PRIMARY_API_KEY || 'not-needed';

/**
 * vLLM 모델 ID. 빈값이면 첫 호출 시 `GET /v1/models`로 자동 디스커버리(첫 모델 사용).
 */
export const LLM_PRIMARY_MODEL = process.env.LLM_PRIMARY_MODEL || '';

/** primary 호출 타임아웃 — 더 빨리 실패하고 fallback 가게 둔다. */
export const LLM_PRIMARY_TIMEOUT_MS = Number(
  process.env.LLM_PRIMARY_TIMEOUT_MS ?? 45_000,
);

/** vLLM은 안정적이라 가정하고 SDK 자체 재시도는 0 — 실패 시 즉시 fallback. */
export const LLM_PRIMARY_MAX_RETRIES = Number(
  process.env.LLM_PRIMARY_MAX_RETRIES ?? 0,
);

/** primary 활성 여부 — base URL 유무로만 결정. */
export const LLM_PRIMARY_ENABLED = LLM_PRIMARY_BASE_URL.length > 0;
