import { sql } from 'drizzle-orm';
import { sqliteTable, integer, text, real, index } from 'drizzle-orm/sqlite-core';

// CEFR 레벨은 MVP에서 A1/A2/B1만 지원 (연령 5~10세 대상)
export const CEFR_LEVELS = ['A1', 'A2', 'B1'] as const;
export type CefrLevel = (typeof CEFR_LEVELS)[number];

// 가족 구성원 프로필
export const profiles = sqliteTable('profiles', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  avatar: text('avatar'), // emoji ("🦊") 또는 이미지 경로
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
});

// 생성된 동화책 (프로필별)
export const books = sqliteTable(
  'books',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    profileId: integer('profile_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    // 레벨: 연령(5~10) × CEFR(A1~B1) 조합
    age: integer('age').notNull(),
    cefr: text('cefr', { enum: CEFR_LEVELS }).notNull(),
    topic: text('topic'), // 예: "숲속 친구들", "우주 모험"
    coverImagePath: text('cover_image_path'), // FLUX 생성 표지 (선택)
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (t) => [
    index('books_profile_idx').on(t.profileId),
    index('books_level_idx').on(t.age, t.cefr),
  ],
);

// 낭독 단위 (문장 또는 짧은 단락)
export const passages = sqliteTable(
  'passages',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    bookId: integer('book_id')
      .notNull()
      .references(() => books.id, { onDelete: 'cascade' }),
    orderIndex: integer('order_index').notNull(), // 0부터 순차
    textEn: text('text_en').notNull(),
    textKo: text('text_ko').notNull(), // 한글 해석 (토글 표시용)
    audioPath: text('audio_path'), // Kokoro TTS 결과 (선택)
    sceneImagePath: text('scene_image_path'), // FLUX 장면 삽화 (선택)
  },
  (t) => [index('passages_book_order_idx').on(t.bookId, t.orderIndex)],
);

// 완독 후 풀이할 4지선다 퀴즈 (책당 5문제)
export const quizzes = sqliteTable(
  'quizzes',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    bookId: integer('book_id')
      .notNull()
      .references(() => books.id, { onDelete: 'cascade' }),
    orderIndex: integer('order_index').notNull(), // 1~5
    question: text('question').notNull(),
    // 4지선다 보기를 JSON 배열로 저장 [A, B, C, D]
    choices: text('choices', { mode: 'json' })
      .$type<[string, string, string, string]>()
      .notNull(),
    answerIndex: integer('answer_index').notNull(), // 0..3
    explanation: text('explanation'), // 한글 해설 (선택)
  },
  (t) => [index('quizzes_book_order_idx').on(t.bookId, t.orderIndex)],
);

// 독서 로그 (프로필별, 재독 시 새 행)
export const readingLogs = sqliteTable(
  'reading_logs',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    profileId: integer('profile_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    bookId: integer('book_id')
      .notNull()
      .references(() => books.id, { onDelete: 'cascade' }),
    startedAt: integer('started_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
    finishedAt: integer('finished_at', { mode: 'timestamp' }),
    progressRatio: real('progress_ratio').notNull().default(0), // 0.0 ~ 1.0
    quizScore: integer('quiz_score'), // 0..5 (완료 시에만)
  },
  (t) => [
    index('logs_profile_idx').on(t.profileId),
    index('logs_book_idx').on(t.bookId),
  ],
);

// 타입 헬퍼 — DB 레이어 사용처에서 바로 import
export type Profile = typeof profiles.$inferSelect;
export type NewProfile = typeof profiles.$inferInsert;
export type Book = typeof books.$inferSelect;
export type NewBook = typeof books.$inferInsert;
export type Passage = typeof passages.$inferSelect;
export type NewPassage = typeof passages.$inferInsert;
export type Quiz = typeof quizzes.$inferSelect;
export type NewQuiz = typeof quizzes.$inferInsert;
export type ReadingLog = typeof readingLogs.$inferSelect;
export type NewReadingLog = typeof readingLogs.$inferInsert;
