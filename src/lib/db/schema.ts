import {
  mysqlTable,
  varchar,
  int,
  text,
  timestamp,
  json,
  double,
  primaryKey,
  index,
  uniqueIndex,
  type AnyMySqlColumn,
} from 'drizzle-orm/mysql-core';
import type { AdapterAccountType } from 'next-auth/adapters';

// ===== Auth.js v5 필수 4테이블 (Drizzle MySQL Adapter 스펙) =====

// 부모(보호자) 인증 계정 — Google / Kakao OAuth로 생성.
// Kakao는 이메일 비공개 선택이 가능하므로 email은 nullable.
// role: 'user' | 'admin' — 어드민 페이지(/admin/*) 접근 권한 구분.
// ADMIN_EMAILS 환경변수 화이트리스트에 포함된 이메일은 첫 로그인 시 events.signIn에서 자동 'admin' 승격.
export const USER_ROLES = ['user', 'admin'] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const users = mysqlTable('users', {
  id: varchar('id', { length: 255 }).primaryKey(),
  name: varchar('name', { length: 255 }),
  email: varchar('email', { length: 255 }),
  emailVerified: timestamp('emailVerified', { fsp: 3 }),
  image: varchar('image', { length: 2048 }),
  passwordHash: varchar('password_hash', { length: 255 }),
  role: varchar('role', { length: 16, enum: USER_ROLES })
    .notNull()
    .default('user'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (t) => [index('users_email_idx').on(t.email)]);

export const accounts = mysqlTable(
  'accounts',
  {
    userId: varchar('userId', { length: 255 })
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: varchar('type', { length: 255 })
      .$type<AdapterAccountType>()
      .notNull(),
    provider: varchar('provider', { length: 255 }).notNull(),
    providerAccountId: varchar('providerAccountId', { length: 255 }).notNull(),
    // 토큰은 길이 가변 → text. 특히 Google id_token은 1KB 이상 가능.
    refresh_token: text('refresh_token'),
    access_token: text('access_token'),
    expires_at: int('expires_at'),
    token_type: varchar('token_type', { length: 255 }),
    scope: varchar('scope', { length: 255 }),
    id_token: text('id_token'),
    session_state: varchar('session_state', { length: 255 }),
  },
  (t) => [primaryKey({ columns: [t.provider, t.providerAccountId] })],
);

export const sessions = mysqlTable('sessions', {
  sessionToken: varchar('sessionToken', { length: 255 }).primaryKey(),
  userId: varchar('userId', { length: 255 })
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  expires: timestamp('expires', { mode: 'date' }).notNull(),
});

export const MOBILE_AUTH_TOKEN_KINDS = [
  'exchange_code',
  'access_token',
] as const;
export type MobileAuthTokenKind = (typeof MOBILE_AUTH_TOKEN_KINDS)[number];

// 네이티브 앱 인증 브리지 — 원문 토큰은 저장하지 않고 SHA-256 hash만 보관한다.
//
// PKCE (RFC 7636): exchange_code 발급 시 앱이 보낸 code_challenge(=Base64URL(SHA-256(verifier)))를
// 함께 저장한다. exchange 호출 시 앱이 보낸 code_verifier를 SHA-256 후 challenge와 비교해
// deep-link 인터셉트로 코드만 탈취한 악성 앱이 토큰을 받아갈 수 없도록 한다.
// 기존 앱(challenge 미전송) 호환을 위해 nullable 유지 — 현 단계는 optional, 안정화 후 require로 전환.
export const mobileAuthTokens = mysqlTable(
  'mobile_auth_tokens',
  {
    id: int('id').autoincrement().primaryKey(),
    userId: varchar('user_id', { length: 255 })
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tokenHash: varchar('token_hash', { length: 64 }).notNull(),
    kind: varchar('kind', { length: 20, enum: MOBILE_AUTH_TOKEN_KINDS })
      .notNull(),
    /** PKCE code_challenge (S256) — exchange_code일 때만 사용. base64url 인코딩 SHA-256 결과. */
    codeChallenge: varchar('code_challenge', { length: 128 }),
    expiresAt: timestamp('expires_at', { mode: 'date' }).notNull(),
    consumedAt: timestamp('consumed_at', { mode: 'date' }),
    revokedAt: timestamp('revoked_at', { mode: 'date' }),
    lastUsedAt: timestamp('last_used_at', { mode: 'date' }),
    createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('mobile_auth_tokens_token_hash_unique').on(t.tokenHash),
    index('mobile_auth_tokens_user_kind_idx').on(t.userId, t.kind),
    index('mobile_auth_tokens_expires_idx').on(t.expiresAt),
  ],
);

export const verificationTokens = mysqlTable(
  'verificationTokens',
  {
    identifier: varchar('identifier', { length: 255 }).notNull(),
    token: varchar('token', { length: 255 }).notNull(),
    expires: timestamp('expires', { mode: 'date' }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.identifier, t.token] })],
);

// ===== 도메인 테이블 =====

// CEFR 레벨. B2는 9~10세 상위 도전 단계로 2026-04-21 추가.
// 배열 확장만으로 마이그레이션 없이 호환됨(enum은 varchar+$type로 구현).
export const CEFR_LEVELS = ['A1', 'A2', 'B1', 'B2'] as const;
export type CefrLevel = (typeof CEFR_LEVELS)[number];

// 자녀 프로필 — users(1) ↔ profiles(N). 부모 계정 삭제 시 자녀 프로필 cascade.
export const profiles = mysqlTable(
  'profiles',
  {
    id: int('id').autoincrement().primaryKey(),
    userId: varchar('user_id', { length: 255 })
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 100 }).notNull(),
    // 5~10세 범위. 새 동화 생성 시 CreateBookDialog에서 중복 입력받지 않고
    // 이 값을 자동 사용한다. DEFAULT 7은 기존 레코드 백필용 — 필요 시 편집 UI로 조정.
    age: int('age').notNull().default(7),
    // emoji ("🦊") 또는 이미지 경로
    avatar: varchar('avatar', { length: 255 }),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (t) => [index('profiles_user_idx').on(t.userId)],
);

// 동화책의 핵심 어휘 항목 (LLM이 추출한 어린이 학습용 어휘·뜻)
export interface VocabularyEntry {
  word: string;
  meaning: string;
}

// 엔딩 분기 (선택형) — 본문이 끝난 뒤 아이가 2개 결말 중 하나를 고른다.
export interface EndingPassage {
  en: string;
  ko: string;
}
export interface AlternateEnding {
  labelA: string;
  labelB: string;
  passagesA: EndingPassage[];
  passagesB: EndingPassage[];
}

// 책 장르 — 픽션(이야기) / 논픽션(지식책) 분기. NULL은 레거시 행이며 fiction으로 해석.
export const BOOK_GENRES = ['fiction', 'non_fiction'] as const;
export type BookGenre = (typeof BOOK_GENRES)[number];

// 논픽션 책 끝부분에 노출되는 추가 정보 카드. 픽션의 alternateEnding 자리를 대체.
export interface FunFact {
  title: string;
  body: string;
}

// 생성 단계 인테이크 — 마법사가 LLM에서 받은 질문 + 사용자 답변을 그대로 보관.
// 답변이 비어 있으면 text=null(건너뜀)로 정규화 저장.
export interface BookIntakeQuestion {
  id: string;
  text: string;
}
export interface BookIntakeAnswer {
  questionId: string;
  text: string | null;
}
export interface BookIntake {
  questions: BookIntakeQuestion[];
  answers: BookIntakeAnswer[];
}

// 생성된 동화책 (프로필별)
export const books = mysqlTable(
  'books',
  {
    id: int('id').autoincrement().primaryKey(),
    profileId: int('profile_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    title: varchar('title', { length: 255 }).notNull(),
    age: int('age').notNull(),
    cefr: varchar('cefr', { length: 2, enum: CEFR_LEVELS }).notNull(),
    topic: varchar('topic', { length: 255 }),
    // 장르. NULL=레거시 fiction. 신규 책은 항상 명시.
    genre: varchar('genre', { length: 16, enum: BOOK_GENRES }),
    coverImagePath: varchar('cover_image_path', { length: 500 }),
    vocabulary: json('vocabulary').$type<VocabularyEntry[]>(),
    alternateEnding: json('alternate_ending').$type<AlternateEnding>(),
    // 결말 분기 passages의 사전 합성 TTS 경로. orderIndex 순으로 정렬된
    // 웹 경로(`/audio/ending-<bookId>-A-<idx>.wav`) 배열. 책 생성 직후
    // after()로 합성된다. 합성 실패한 슬롯은 ''(빈 문자열)로 보존하여
    // 인덱스 정렬을 유지한다. 합성 전(혹은 레거시 책)은 NULL.
    endingAudioPathsA: json('ending_audio_paths_a').$type<string[]>(),
    endingAudioPathsB: json('ending_audio_paths_b').$type<string[]>(),
    // 논픽션 전용. 픽션은 NULL.
    funFacts: json('fun_facts').$type<FunFact[]>(),
    // 마법사 인테이크 원본 보존(재생성/품질 회귀 분석용).
    intake: json('intake').$type<BookIntake>(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    // soft delete. NULL이면 활성, 값이 있으면 숨김.
    deletedAt: timestamp('deleted_at'),
    // AI 생성물 신고. NULL이면 정상, 값이 있으면 보호자 모드에서만 검토·복원·완전 삭제 가능.
    flaggedAt: timestamp('flagged_at'),
    flaggedReason: varchar('flagged_reason', { length: 500 }),
  },
  (t) => [
    index('books_profile_idx').on(t.profileId),
    index('books_level_idx').on(t.age, t.cefr),
  ],
);

// 낭독 단위 (문장 또는 짧은 단락)
export const passages = mysqlTable(
  'passages',
  {
    id: int('id').autoincrement().primaryKey(),
    bookId: int('book_id')
      .notNull()
      .references(() => books.id, { onDelete: 'cascade' }),
    orderIndex: int('order_index').notNull(),
    textEn: text('text_en').notNull(),
    textKo: text('text_ko').notNull(),
    audioPath: varchar('audio_path', { length: 500 }),
    sceneImagePath: varchar('scene_image_path', { length: 500 }),
  },
  (t) => [index('passages_book_order_idx').on(t.bookId, t.orderIndex)],
);

// 완독 후 풀이할 4지선다 퀴즈 (책당 5문제)
export const quizzes = mysqlTable(
  'quizzes',
  {
    id: int('id').autoincrement().primaryKey(),
    bookId: int('book_id')
      .notNull()
      .references(() => books.id, { onDelete: 'cascade' }),
    orderIndex: int('order_index').notNull(),
    question: text('question').notNull(),
    choices: json('choices').$type<[string, string, string, string]>().notNull(),
    answerIndex: int('answer_index').notNull(),
    explanation: text('explanation'),
  },
  (t) => [index('quizzes_book_order_idx').on(t.bookId, t.orderIndex)],
);

// 독서 로그 (프로필별, 재독 시 새 행)
export const readingLogs = mysqlTable(
  'reading_logs',
  {
    id: int('id').autoincrement().primaryKey(),
    profileId: int('profile_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    bookId: int('book_id')
      .notNull()
      .references(() => books.id, { onDelete: 'cascade' }),
    startedAt: timestamp('started_at').notNull().defaultNow(),
    finishedAt: timestamp('finished_at'),
    progressRatio: double('progress_ratio').notNull().default(0),
    quizScore: int('quiz_score'),
  },
  (t) => [
    index('logs_profile_idx').on(t.profileId),
    index('logs_book_idx').on(t.bookId),
  ],
);

// 별(⭐) 크레딧 잔액 — 가족(users) 단위 1행.
// 잔액은 무기한(만료 없음). 책 생성 시 1 차감, 패키지 구매 시 +N 적립.
// 동시 차감 경쟁 조건 방지를 위해 billing/credits.ts는 FOR UPDATE 잠금으로 트랜잭션 수행.
export const creditBalances = mysqlTable('credit_balances', {
  userId: varchar('user_id', { length: 255 })
    .notNull()
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  balance: int('balance').notNull().default(0),
  totalPurchased: int('total_purchased').notNull().default(0),
  updatedAt: timestamp('updated_at').notNull().defaultNow().onUpdateNow(),
});

// 크레딧 원장 — 감사 추적·환불 대비. 양수=적립/음수=차감.
// kind: 'purchase'(패키지 구매), 'consume'(책 생성), 'grant'(운영자 지급), 'refund'(환불)
export const CREDIT_TX_KINDS = ['purchase', 'consume', 'grant', 'refund'] as const;
export type CreditTxKind = (typeof CREDIT_TX_KINDS)[number];

export const creditTransactions = mysqlTable(
  'credit_transactions',
  {
    id: int('id').autoincrement().primaryKey(),
    userId: varchar('user_id', { length: 255 })
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    kind: varchar('kind', { length: 16, enum: CREDIT_TX_KINDS }).notNull(),
    delta: int('delta').notNull(),
    packageId: varchar('package_id', { length: 16 }),
    bookId: int('book_id').references(() => books.id, { onDelete: 'set null' }),
    // 환불(kind='refund') 행이 보상하는 원본 tx의 id. idempotent 환불 보장:
    // 동일 reversedTxId가 이미 존재하면 refundCredit은 no-op.
    // SET NULL on delete: 원본이 cascade로 사라져도 환불 행은 감사 추적용으로 유지.
    // self-reference: AnyMySqlColumn 캐스트로 lazy 평가 (TypeScript 순환 추론 회피).
    reversedTxId: int('reversed_tx_id').references(
      (): AnyMySqlColumn => creditTransactions.id,
      { onDelete: 'set null' },
    ),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (t) => [
    index('credit_tx_user_idx').on(t.userId, t.createdAt),
    index('credit_tx_book_idx').on(t.bookId),
    uniqueIndex('credit_tx_reversed_idx').on(t.reversedTxId),
  ],
);

// 결제 주문 — 포트원 V2 결제 모듈 경유.
// 흐름: client checkout → status='pending' → 포트원 결제창 → redirectUrl(/subscribe/success) →
//       서버 confirm → 포트원 GET /payments/{id} → grantCredits → status='confirmed'.
// 환불 정책: 환불 불가(요구사항). status='cancelled'/'refunded'는 미사용.
export const ORDER_STATUSES = [
  'pending',
  'confirmed',
  'failed',
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const STAR_PACK_IDS = ['small', 'medium', 'large'] as const;
export type StarPackIdDb = (typeof STAR_PACK_IDS)[number];

export const orders = mysqlTable(
  'orders',
  {
    id: int('id').autoincrement().primaryKey(),
    userId: varchar('user_id', { length: 255 })
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    /** 별 패키지 ID — 'small' | 'medium' | 'large'. */
    packageId: varchar('package_id', { length: 16, enum: STAR_PACK_IDS }).notNull(),
    /** 정가(원) — 패키지 정의 시점에 고정. 포트원 결제창에 보내는 금액과 일치해야 함. */
    amount: int('amount').notNull(),
    /** 적립 예정 별 개수. */
    stars: int('stars').notNull(),
    /**
     * 우리 시스템이 발급하는 unique paymentId — PortOne `requestPayment`에 그대로 전달.
     * 포트원 V2 paymentId 규격: 영문/숫자/-/_ 6~64자 — UUID v4 (36자) 호환.
     */
    paymentId: varchar('payment_id', { length: 64 }).notNull().unique(),
    /**
     * PG 거래 식별자 — confirm 시 포트원 단건 조회 응답의 `transactionId`를 저장.
     * 환불·CS 시 포트원 콘솔에서 거래 추적 키.
     */
    pgTxId: varchar('pg_tx_id', { length: 200 }),
    /** 결제 수단 — confirm 응답의 `method.type` ('Card','EasyPay' 등). */
    payMethod: varchar('pay_method', { length: 32 }),
    /** 영수증 URL — PG가 발급(포트원이 그대로 중계). */
    receiptUrl: varchar('receipt_url', { length: 500 }),
    status: varchar('status', { length: 16, enum: ORDER_STATUSES })
      .notNull()
      .default('pending'),
    /** 실패 사유 코드 — PG/포트원이 반환하면 저장(예: 'PG_ERROR','USER_CANCEL'). */
    failureCode: varchar('failure_code', { length: 64 }),
    confirmedAt: timestamp('confirmed_at'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow().onUpdateNow(),
  },
  (t) => [
    index('orders_user_idx').on(t.userId, t.createdAt),
    index('orders_status_idx').on(t.status),
  ],
);

// 가족(user) 단위 구독 레코드 — 결제 이력/가입 통계용으로 보존.
// (책 생성 한도는 별 크레딧으로 단일화되어 cycleAnchorDay는 더 이상 차감 게이트에 쓰이지 않음.)
export const subscriptions = mysqlTable('subscriptions', {
  id: int('id').autoincrement().primaryKey(),
  userId: varchar('user_id', { length: 255 })
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' })
    .unique(),
  // 구독 앵커 일(day-of-month). 최초 호출 시 UTC 날짜로 초기화, 결제 시 갱신.
  cycleAnchorDay: int('cycle_anchor_day').notNull(),
  startedAt: timestamp('started_at').notNull().defaultNow(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow().onUpdateNow(),
});

// ===== 타입 헬퍼 — DB 레이어 사용처에서 바로 import =====

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
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
export type CreditBalance = typeof creditBalances.$inferSelect;
export type NewCreditBalance = typeof creditBalances.$inferInsert;
export type CreditTransaction = typeof creditTransactions.$inferSelect;
export type NewCreditTransaction = typeof creditTransactions.$inferInsert;
export type Subscription = typeof subscriptions.$inferSelect;
export type NewSubscription = typeof subscriptions.$inferInsert;
export type Order = typeof orders.$inferSelect;
export type NewOrder = typeof orders.$inferInsert;
