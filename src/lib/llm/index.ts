import { chatJson } from './client';
import {
  StorySchema,
  QuizSetSchema,
  TranslationSchema,
  type Story,
  type QuizSet,
  type Translation,
  type Level,
} from './schemas';
import { buildStoryPrompt } from './prompts/story';
import { buildQuizPrompt } from './prompts/quiz';
import { buildTranslationPrompt } from './prompts/translation';

export { OPENAI_MODEL, OPENAI_BASE_URL } from './config';
export { LLMError } from './client';
export type { Story, QuizSet, Translation, Level } from './schemas';
export {
  StorySchema,
  QuizSetSchema,
  TranslationSchema,
  LevelSchema,
} from './schemas';

/**
 * 레벨·(선택)주제에 맞춰 영어 동화 1편 생성 + Zod 검증.
 */
export async function generateStory(
  level: Level,
  topic?: string,
): Promise<Story> {
  const { system, user } = buildStoryPrompt(level, topic);
  // temperature는 gpt-5.2-chat-latest가 1 고정이라 지정하지 않는다.
  // 창의성이 필요한 작업은 프롬프트 표현으로 유도.
  const raw = await chatJson<unknown>({ system, user });
  return StorySchema.parse(raw);
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
  const raw = await chatJson<unknown>({ system, user });
  return QuizSetSchema.parse(raw);
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
  const raw = await chatJson<unknown>({ system, user });
  return TranslationSchema.parse(raw);
}
