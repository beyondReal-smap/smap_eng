import { z } from 'zod';
import { CEFR_LEVELS } from '@/lib/db/schema';

// 동화 1편의 출력 스키마 — LLM이 반환해야 할 JSON 구조
export const StorySchema = z.object({
  title: z.string().min(1).max(80),
  topic: z.string().min(1).max(60),
  passages: z
    .array(
      z.object({
        en: z.string().min(1),
        ko: z.string().min(1),
      }),
    )
    .min(6)
    .max(25),
  vocabulary: z
    .array(
      z.object({
        word: z.string().min(1),
        meaning: z.string().min(1), // 한글 뜻
      }),
    )
    .max(15)
    .optional(),
});
export type Story = z.infer<typeof StorySchema>;

// 퀴즈 세트 스키마 — 4지선다 5문제
export const QuizSetSchema = z.object({
  quizzes: z
    .array(
      z.object({
        question: z.string().min(1),
        choices: z.tuple([z.string(), z.string(), z.string(), z.string()]),
        answer_index: z.number().int().min(0).max(3),
        explanation: z.string().optional(),
      }),
    )
    .length(5),
});
export type QuizSet = z.infer<typeof QuizSetSchema>;

// 한글 해석 스키마 — 문장 단위 번역
export const TranslationSchema = z.object({
  translations: z.array(
    z.object({
      en: z.string().min(1),
      ko: z.string().min(1),
      notes: z
        .array(
          z.object({
            word: z.string(),
            meaning: z.string(),
          }),
        )
        .optional(),
    }),
  ),
});
export type Translation = z.infer<typeof TranslationSchema>;

// 공통 입력 — 레벨 파라미터
export const LevelSchema = z.object({
  age: z.number().int().min(5).max(10),
  cefr: z.enum(CEFR_LEVELS),
});
export type Level = z.infer<typeof LevelSchema>;
