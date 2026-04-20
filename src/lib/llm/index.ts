import { ollamaChatJson } from './client';
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

export { OLLAMA_MODEL, OLLAMA_BASE_URL } from './config';
export type { Story, QuizSet, Translation, Level } from './schemas';
export { StorySchema, QuizSetSchema, TranslationSchema, LevelSchema } from './schemas';

/**
 * 레벨·(선택)주제에 맞춰 영어 동화 1편 생성 + Zod 검증.
 */
export async function generateStory(level: Level, topic?: string): Promise<Story> {
  const { system, user } = buildStoryPrompt(level, topic);
  const raw = await ollamaChatJson<unknown>({
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    temperature: 0.9,
  });
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
  const raw = await ollamaChatJson<unknown>({
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    temperature: 0.3, // 문제 출제는 낮은 창의성으로
  });
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
  const raw = await ollamaChatJson<unknown>({
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    temperature: 0.2,
  });
  return TranslationSchema.parse(raw);
}
