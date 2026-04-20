// OpenAI Chat Completions 설정
// API 키는 OPENAI_API_KEY 환경변수로만 전달 — 절대 하드코딩/커밋 금지

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
