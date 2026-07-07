import { chatJson } from './client';
import {
  BookSchema,
  IntakeQuestionsSchema,
  QuizSetSchema,
  StorySchema,
  TranslationSchema,
  type Book,
  type BookIntakeInput,
  type IntakeQuestions,
  type Level,
  type QuizSet,
  type Story,
  type Translation,
} from './schemas';
import { buildBookPrompt, buildStoryPrompt } from './prompts/book';
import { buildIntakeQuestionsPrompt } from './prompts/intake-questions';
import { buildQuizPrompt } from './prompts/quiz';
import { buildTranslationPrompt } from './prompts/translation';
import type { BookGenre } from '@/lib/db/schema';

export { OPENAI_MODEL, OPENAI_BASE_URL } from './config';
export { LLMError } from './client';
export type {
  Book,
  BookIntakeInput,
  IntakeQuestions,
  Level,
  QuizSet,
  Story,
  Translation,
} from './schemas';
export {
  BookGenreSchema,
  BookIntakeSchema,
  BookSchema,
  IntakeQuestionsSchema,
  LevelSchema,
  QuizSetSchema,
  StorySchema,
  TranslationSchema,
} from './schemas';

interface GenerateBookArgs {
  level: Level;
  /** 'fiction' | 'non_fiction'. 미지정 시 'fiction'. */
  genre?: BookGenre;
  /** 자유 토픽 1줄(레거시 호환). intake와 동시 지정 가능. */
  topic?: string;
  /** 마법사 인테이크 — Q&A 페어. 답변이 비면 자동 무시. */
  intake?: BookIntakeInput;
}

/**
 * 레벨/장르/(선택)인테이크에 맞춰 책 1편 생성 + Zod 검증.
 *
 * 픽션이면 alternateEnding이, 논픽션이면 funFacts가 채워지도록 프롬프트로 유도하지만
 * 둘 다 optional이라 LLM 변동성에도 fail-soft.
 */
export async function generateBook(args: GenerateBookArgs): Promise<Book> {
  const { system, user } = buildBookPrompt(args);
  // passage당 문장 수를 3~6문장(미니 장면)으로 확대하면서 en+ko 출력이 대폭 길어져,
  // 12k로는 B1·B2 긴 책에서 finish_reason=length로 잘릴 수 있어 16k로 상향한다.
  // 16k 토큰 출력은 클라이언트 기본 timeout(45s/60s)으로는 도중에 끊겨 SDK가
  // 같은 비싼 요청을 재시도하게 되므로, 이 호출만 150s로 상향한다.
  return chatJson({
    system,
    user,
    maxCompletionTokens: 16000,
    timeoutMs: 150_000,
    validate: (raw) => BookSchema.parse(raw),
  });
}

/**
 * Backward-compat — 기존 호출처가 generateBook으로 옮겨갈 때까지 유지.
 * 픽션 기본값이라 동일 결과.
 */
export async function generateStory(
  level: Level,
  topic?: string,
): Promise<Story> {
  const { system, user } = buildStoryPrompt(level, topic);
  return chatJson({ system, user, validate: (raw) => StorySchema.parse(raw) });
}

/**
 * 마법사 step 3에서 사용할 한국어 인테이크 질문 2~3개를 LLM으로 생성.
 * 별 차감 없음. 동일 (genre, level) 쌍에 대해 호출처에서 메모리 캐시 적용.
 */
export async function generateIntakeQuestions(args: {
  genre: BookGenre;
  level: Level;
}): Promise<IntakeQuestions> {
  const { system, user } = buildIntakeQuestionsPrompt(args);
  return chatJson({
    system,
    user,
    validate: (raw) => IntakeQuestionsSchema.parse(raw),
  });
}

/**
 * 완독한 동화로부터 4지선다 5문제 생성 + Zod 검증.
 */
export async function generateQuizSet(ctx: {
  title: string;
  passages: { en: string; ko: string }[];
  level: Level;
}): Promise<QuizSet> {
  const { system, user } = buildQuizPrompt(ctx);
  // 낮은 창의성이 필요하지만 모델 제약상 temperature 지정 불가 —
  // 프롬프트에서 "do not add outside information" 식으로 제어.
  return chatJson({ system, user, validate: (raw) => QuizSetSchema.parse(raw) });
}

/**
 * 영문 문장 배열을 한글로 번역 (문장별 주석 포함 가능).
 */
export async function translateSentences(
  englishSentences: string[],
): Promise<Translation> {
  if (englishSentences.length === 0) {
    return { translations: [] };
  }
  const { system, user } = buildTranslationPrompt(englishSentences);
  // 번역도 낮은 창의성이 이상적이지만 모델 제약상 temperature 지정 불가.
  return chatJson({
    system,
    user,
    validate: (raw) => TranslationSchema.parse(raw),
  });
}
