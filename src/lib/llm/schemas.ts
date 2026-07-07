import { z } from 'zod';
import { BOOK_GENRES, CEFR_LEVELS } from '@/lib/db/schema';

// 동화/논픽션 책 1편의 출력 스키마 — LLM이 반환해야 할 JSON 구조.
// alternateEnding/funFacts 둘 다 옵션: LLM이 지시를 못 따랐을 때도 전체 생성이 실패하지
// 않도록 fail-soft. 픽션은 alternateEnding을, 논픽션은 funFacts를 채우도록 프롬프트로 유도.
const EndingPassageSchema = z.object({
  en: z.string().min(1),
  ko: z.string().min(1),
});
// LLM 출력 길이는 모델 변동성이 커 엄격한 상한이 false-positive(zod 실패) 원인이
// 된다. UI에는 어차피 truncate/CSS overflow로 처리하므로 상한을 넉넉히 둔다.
export const BookSchema = z.object({
  title: z.string().min(1).max(120),
  topic: z.string().min(1).max(120),
  passages: z
    .array(EndingPassageSchema)
    .min(6)
    .max(40),
  vocabulary: z
    .array(
      z.object({
        word: z.string().min(1),
        meaning: z.string().min(1), // 한글 뜻
      }),
    )
    // CEFR 레벨별 vocabCount 상한(B2=100)에 여유를 두고 110까지 허용.
    .max(110)
    .optional(),
  alternateEnding: z
    .object({
      labelA: z.string().min(1).max(80),
      labelB: z.string().min(1).max(80),
      passagesA: z.array(EndingPassageSchema).min(2).max(4),
      passagesB: z.array(EndingPassageSchema).min(2).max(4),
    })
    .optional(),
  funFacts: z
    .array(
      z.object({
        title: z.string().min(1).max(80),
        body: z.string().min(1).max(280),
      }),
    )
    .min(2)
    .max(4)
    .optional(),
  // 책 속 미션(워드 헌트 + 확인 질문) — alternateEnding/funFacts와 동일한
  // fail-soft optional. LLM이 못 채워도 전체 생성은 성공해야 한다.
  // targetWord가 실제 passage에 존재하는지는 여기서 검증하지 않고(false-positive
  // Zod 실패 방지) 리더가 매칭 실패 시 해당 미션을 조용히 숨긴다.
  missions: z
    .array(
      z.object({
        passageIndex: z.number().int().min(0),
        wordHunt: z
          .object({
            targetWord: z.string().min(1).max(40),
            hintKo: z.string().min(1).max(120),
          })
          .optional(),
        check: z
          .object({
            question: z.string().min(1).max(200),
            choices: z.tuple([z.string().min(1), z.string().min(1)]),
            answerIndex: z.union([z.literal(0), z.literal(1)]),
          })
          .optional(),
      }),
    )
    .max(8)
    .optional(),
});
export type Book = z.infer<typeof BookSchema>;

// Backward-compat alias — 기존 호출처가 점진적으로 generateBook으로 이동하는 동안 유지.
export const StorySchema = BookSchema;
export type Story = Book;

// 인테이크 질문 생성 스키마 — POST /api/books/intake/questions 응답.
export const IntakeQuestionsSchema = z.object({
  questions: z
    .array(
      z.object({
        // slug 형태(영문 소문자/숫자/하이픈) — 클라가 answerKey로 사용.
        id: z
          .string()
          .min(1)
          .max(40)
          .regex(/^[a-z0-9][a-z0-9-]*$/, 'id must be a slug'),
        // 한국어 질문 본문.
        text: z.string().min(1).max(120),
        // 입력칸 placeholder(선택).
        placeholder: z.string().max(80).optional(),
        // 선택지 칩 — 사용자가 클릭하면 해당 답변으로 자동 입력.
        suggestionChips: z.array(z.string().min(1).max(40)).max(4).optional(),
      }),
    )
    .min(2)
    .max(3),
});
export type IntakeQuestions = z.infer<typeof IntakeQuestionsSchema>;

// 책 생성 입력의 인테이크 페이로드 — /api/books POST에서 받음.
export const BookIntakeSchema = z
  .object({
    questions: z
      .array(
        z.object({
          id: z.string().min(1).max(40),
          text: z.string().min(1).max(200),
        }),
      )
      .min(2)
      .max(3),
    answers: z
      .array(
        z.object({
          questionId: z.string().min(1).max(40),
          // 빈 답변(건너뜀)은 null로 정규화. 답변 내용 max 500자.
          text: z.string().min(1).max(500).nullable(),
        }),
      )
      .max(3),
  })
  // questions에 없는 questionId가 answers에 있으면 거절(클라 위변조 방지).
  .superRefine((val, ctx) => {
    const validIds = new Set(val.questions.map((q) => q.id));
    val.answers.forEach((a, i) => {
      if (!validIds.has(a.questionId)) {
        ctx.addIssue({
          code: 'custom',
          message: `unknown questionId: ${a.questionId}`,
          path: ['answers', i, 'questionId'],
        });
      }
    });
  });
export type BookIntakeInput = z.infer<typeof BookIntakeSchema>;

export const BookGenreSchema = z.enum(BOOK_GENRES);

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
