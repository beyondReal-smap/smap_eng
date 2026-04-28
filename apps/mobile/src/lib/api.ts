import { z } from 'zod';

import { API_BASE_URL } from '@/lib/config';
import { getMobileAccessToken } from '@/lib/mobile-session';
import type { MobileSession } from '@/lib/mobile-session';

const VocabularyEntrySchema = z.object({
  word: z.string(),
  meaning: z.string(),
});

const VocabEntrySchema = VocabularyEntrySchema.extend({
  bookId: z.number(),
  bookTitle: z.string(),
});

const FunFactSchema = z.object({
  title: z.string(),
  body: z.string(),
});

const EndingPassageSchema = z.object({
  en: z.string(),
  ko: z.string(),
});

const AlternateEndingSchema = z.object({
  labelA: z.string(),
  labelB: z.string(),
  passagesA: z.array(EndingPassageSchema),
  passagesB: z.array(EndingPassageSchema),
});

const IntakeQuestionSchema = z.object({
  id: z.string(),
  text: z.string(),
  placeholder: z.string().optional(),
  suggestionChips: z.array(z.string()).optional(),
});

const BookIntakePayloadSchema = z.object({
  questions: z.array(z.object({ id: z.string(), text: z.string() })),
  answers: z.array(z.object({ questionId: z.string(), text: z.string().nullable() })),
});

function parseJsonStringField(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

const VocabularyFieldSchema = z.preprocess(
  parseJsonStringField,
  z.array(VocabularyEntrySchema).nullable(),
);

const AlternateEndingFieldSchema = z.preprocess(
  parseJsonStringField,
  AlternateEndingSchema.nullable(),
);

const FunFactsFieldSchema = z.preprocess(
  parseJsonStringField,
  z.array(FunFactSchema).nullable(),
);

const IntakeFieldSchema = z.preprocess(
  parseJsonStringField,
  BookIntakePayloadSchema.nullable(),
);

const QuizChoicesSchema = z.preprocess(
  parseJsonStringField,
  z.tuple([z.string(), z.string(), z.string(), z.string()]),
);

export const ProfileSchema = z.object({
  id: z.number(),
  userId: z.string(),
  name: z.string(),
  age: z.number(),
  avatar: z.string().nullable(),
  createdAt: z.string().or(z.date()),
});

export const BookSchema = z.object({
  id: z.number(),
  profileId: z.number(),
  title: z.string(),
  age: z.number(),
  cefr: z.enum(['A1', 'A2', 'B1', 'B2']),
  topic: z.string().nullable(),
  genre: z.enum(['fiction', 'non_fiction']).nullable().optional(),
  coverImagePath: z.string().nullable(),
  vocabulary: VocabularyFieldSchema,
  alternateEnding: AlternateEndingFieldSchema,
  funFacts: FunFactsFieldSchema.optional().nullable(),
  intake: IntakeFieldSchema.optional().nullable(),
  createdAt: z.string().or(z.date()),
  deletedAt: z.string().or(z.date()).nullable(),
  flaggedAt: z.string().or(z.date()).nullable(),
  flaggedReason: z.string().nullable(),
});

export const PassageSchema = z.object({
  id: z.number(),
  bookId: z.number(),
  orderIndex: z.number(),
  textEn: z.string(),
  textKo: z.string(),
  audioPath: z.string().nullable(),
  sceneImagePath: z.string().nullable(),
});

export const QuizSchema = z.object({
  id: z.number(),
  bookId: z.number(),
  orderIndex: z.number(),
  question: z.string(),
  choices: QuizChoicesSchema,
  answerIndex: z.number().int().min(0).max(3),
  explanation: z.string().nullable(),
});

export const ReadingLogSchema = z.object({
  id: z.number(),
  profileId: z.number(),
  bookId: z.number(),
  startedAt: z.string().or(z.date()),
  finishedAt: z.string().or(z.date()).nullable(),
  progressRatio: z.number(),
  quizScore: z.number().nullable(),
});

export const BookProgressStatSchema = z.object({
  progressRatio: z.number(),
  quizScore: z.number().nullable(),
  finishedAtUnix: z.number().nullable(),
  startedAtUnix: z.number(),
});

const ProfilesResponseSchema = z.object({
  profiles: z.array(ProfileSchema),
});

const CreateProfileResponseSchema = z.object({
  profile: ProfileSchema,
});

const BooksResponseSchema = z.object({
  books: z.array(BookSchema),
  stats: z.record(z.string(), BookProgressStatSchema),
});

const CreateBookResponseSchema = z.object({
  book: BookSchema,
});

const BookDetailResponseSchema = z.object({
  book: BookSchema,
  passages: z.array(PassageSchema),
});

const TtsResponseSchema = z.object({
  audioPath: z.string(),
});

const WordTtsResponseSchema = z.object({
  audioPath: z.string(),
});

const PassageImageResponseSchema = z.object({
  sceneImagePath: z.string(),
});

const CoverImageResponseSchema = z.object({
  coverImagePath: z.string(),
});

const QuizzesResponseSchema = z.object({
  quizzes: z.array(QuizSchema),
  created: z.boolean().optional(),
});

const ReadingLogResponseSchema = z.object({
  log: ReadingLogSchema,
});

const MobileExchangeResponseSchema = z.object({
  accessToken: z.string(),
  expiresAtUnix: z.number().int().positive(),
  issuedAtUnix: z.number().int().positive(),
});

const CreditBalanceSchema = z.object({
  balance: z.number(),
  totalPurchased: z.number(),
});

const CreditsResponseSchema = z.object({
  credits: CreditBalanceSchema,
});

const LearningSummarySchema = z.object({
  totalBooksRead: z.number(),
  totalFinishedSessions: z.number(),
  totalPerfectScores: z.number(),
  averageAccuracy: z.number().nullable(),
  lastFinishedAtUnix: z.number().nullable(),
  continueBookId: z.number().nullable(),
  activeDaysThisWeek: z.array(z.string()),
  activeDaysThisMonth: z.array(z.string()),
  thisMonth: z.string(),
});

const LearningSummaryResponseSchema = z.object({
  summary: LearningSummarySchema,
});

const VocabResponseSchema = z.object({
  entries: z.array(VocabEntrySchema),
});

const ParentReportSchema = z.object({
  profileId: z.number(),
  name: z.string(),
  avatar: z.string().nullable(),
  booksCreatedWeek: z.number(),
  sessionsFinishedWeek: z.number(),
  averageAccuracyWeek: z.number().nullable(),
  totalBooks: z.number(),
  totalPerfect: z.number(),
  activeDays: z.array(z.string()),
  flaggedBooks: z.array(z.object({
    id: z.number(),
    title: z.string(),
    reason: z.string().nullable(),
    flaggedAt: z.string(),
  })),
});

const ParentReportResponseSchema = z.object({
  report: z.array(ParentReportSchema),
});

const IntakeQuestionsResponseSchema = z.object({
  questions: z.array(IntakeQuestionSchema),
  cached: z.boolean().optional(),
});

export type Profile = z.infer<typeof ProfileSchema>;
export type Book = z.infer<typeof BookSchema>;
export type Passage = z.infer<typeof PassageSchema>;
export type Quiz = z.infer<typeof QuizSchema>;
export type ReadingLog = z.infer<typeof ReadingLogSchema>;
export type BookProgressStat = z.infer<typeof BookProgressStatSchema>;
export type BookDetail = z.infer<typeof BookDetailResponseSchema>;
export type CreditBalance = z.infer<typeof CreditBalanceSchema>;
export type LearningSummary = z.infer<typeof LearningSummarySchema>;
export type VocabEntry = z.infer<typeof VocabEntrySchema>;
export type VocabularyEntry = z.infer<typeof VocabularyEntrySchema>;
export type ParentReport = z.infer<typeof ParentReportSchema>;
export type IntakeQuestion = z.infer<typeof IntakeQuestionSchema>;
export type BookIntakePayload = z.infer<typeof BookIntakePayloadSchema>;
export type AlternateEnding = z.infer<typeof AlternateEndingSchema>;
export type EndingPassage = z.infer<typeof EndingPassageSchema>;
export type FunFact = z.infer<typeof FunFactSchema>;
export type CefrLevel = Book['cefr'];
export type BookGenre = 'fiction' | 'non_fiction';

export class MobileApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body?: unknown,
  ) {
    super(message);
    this.name = 'MobileApiError';
  }
}

async function parseJsonResponse(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    throw new MobileApiError('API returned non-JSON response', res.status);
  }
}

async function request<T>(
  path: string,
  schema: z.ZodType<T>,
  init?: RequestInit,
): Promise<T> {
  const token = await getMobileAccessToken();
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
    credentials: 'include',
  });
  const body = await parseJsonResponse(res);
  if (!res.ok) {
    const message =
      typeof body === 'object' && body !== null && 'message' in body
        ? String(body.message)
        : `http_${res.status}`;
    throw new MobileApiError(message, res.status, body);
  }
  return schema.parse(body);
}

export async function fetchProfiles(): Promise<Profile[]> {
  const data = await request('/api/profiles', ProfilesResponseSchema);
  return data.profiles;
}

export async function createProfile(input: {
  name: string;
  age: number;
  avatar?: string;
}): Promise<Profile> {
  const data = await request('/api/profiles', CreateProfileResponseSchema, {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return data.profile;
}

export async function fetchBooks(profileId: number): Promise<{
  books: Book[];
  stats: Record<string, BookProgressStat>;
}> {
  return request(`/api/books?profileId=${profileId}`, BooksResponseSchema);
}

export async function createBook(input: {
  profileId: number;
  level: {
    age: number;
    cefr: CefrLevel;
  };
  genre: BookGenre;
  topic?: string;
  intake?: BookIntakePayload;
}): Promise<Book> {
  const data = await request('/api/books', CreateBookResponseSchema, {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return data.book;
}

export async function fetchBookDetail(bookId: number): Promise<BookDetail> {
  return request(`/api/books/${bookId}`, BookDetailResponseSchema);
}

export async function synthesizePassageAudio(passageId: number): Promise<string> {
  const data = await request(`/api/tts/${passageId}`, TtsResponseSchema, {
    method: 'POST',
  });
  return data.audioPath;
}

export async function synthesizeWordAudio(text: string): Promise<string> {
  const data = await request('/api/tts/word', WordTtsResponseSchema, {
    method: 'POST',
    body: JSON.stringify({ text }),
  });
  return data.audioPath;
}

export async function generatePassageImage(passageId: number): Promise<string> {
  const data = await request(`/api/image/passage/${passageId}`, PassageImageResponseSchema, {
    method: 'POST',
  });
  return data.sceneImagePath;
}

export async function regenerateBookCover(bookId: number): Promise<string> {
  const data = await request(`/api/image/book/${bookId}/cover`, CoverImageResponseSchema, {
    method: 'POST',
    body: JSON.stringify({ force: true }),
  });
  return data.coverImagePath;
}

export async function startReadingLog(profileId: number, bookId: number): Promise<ReadingLog> {
  const data = await request('/api/logs', ReadingLogResponseSchema, {
    method: 'POST',
    body: JSON.stringify({ profileId, bookId }),
  });
  return data.log;
}

export async function updateReadingLog(input: {
  id: number;
  progressRatio?: number;
  finishedAtUnix?: number;
  quizScore?: number;
}): Promise<ReadingLog> {
  const data = await request('/api/logs', ReadingLogResponseSchema, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
  return data.log;
}

export async function getOrCreateQuizzes(bookId: number): Promise<Quiz[]> {
  const data = await request(`/api/books/${bookId}/quiz`, QuizzesResponseSchema, {
    method: 'POST',
  });
  return data.quizzes;
}

export async function exchangeMobileCode(code: string, codeVerifier?: string | null): Promise<MobileSession> {
  return request('/api/auth/mobile/exchange', MobileExchangeResponseSchema, {
    method: 'POST',
    body: JSON.stringify(codeVerifier ? { code, code_verifier: codeVerifier } : { code }),
  });
}

export async function loginWithEmail(input: {
  email: string;
  password: string;
}): Promise<MobileSession> {
  return request('/api/auth/mobile/password', MobileExchangeResponseSchema, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function fetchCredits(): Promise<CreditBalance> {
  const data = await request('/api/billing/credits', CreditsResponseSchema);
  return data.credits;
}

export async function fetchLearningSummary(profileId: number): Promise<LearningSummary> {
  const data = await request(`/api/learning-summary?profileId=${profileId}`, LearningSummaryResponseSchema);
  return data.summary;
}

export async function fetchVocabulary(profileId: number): Promise<VocabEntry[]> {
  const data = await request(`/api/vocab?profileId=${profileId}`, VocabResponseSchema);
  return data.entries;
}

export async function fetchParentReport(): Promise<ParentReport[]> {
  const data = await request('/api/parents/report', ParentReportResponseSchema);
  return data.report;
}

export async function fetchIntakeQuestions(input: {
  profileId: number;
  genre: BookGenre;
  cefr: CefrLevel;
}): Promise<IntakeQuestion[]> {
  const data = await request('/api/books/intake/questions', IntakeQuestionsResponseSchema, {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return data.questions;
}

export async function updateBookTitle(bookId: number, title: string): Promise<Book> {
  const data = await request(`/api/books/${bookId}`, CreateBookResponseSchema, {
    method: 'PATCH',
    body: JSON.stringify({ title }),
  });
  return data.book;
}

export async function deleteBook(bookId: number): Promise<Book> {
  const data = await request(`/api/books/${bookId}`, CreateBookResponseSchema, {
    method: 'DELETE',
  });
  return data.book;
}

export async function flagBook(bookId: number, reason: string): Promise<Book> {
  const data = await request(`/api/books/${bookId}/flag`, CreateBookResponseSchema, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
  return data.book;
}

export async function unflagBook(bookId: number): Promise<Book> {
  const data = await request(`/api/books/${bookId}/flag`, CreateBookResponseSchema, {
    method: 'DELETE',
  });
  return data.book;
}

export function toApiAssetUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  return `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}
