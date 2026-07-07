import { and, desc, eq, isNotNull, isNull, like, or } from 'drizzle-orm';
import { db } from '../index';
import {
  books,
  passages,
  type Book,
  type CefrLevel,
  type NewBook,
  type NewPassage,
  type VocabularyEntry,
} from '../schema';
import { parseJsonColumn } from './_shared';

// ===== Books =====

export function normalizeBookJsonFields(row: Book): Book {
  return {
    ...row,
    vocabulary: parseJsonColumn<NonNullable<Book['vocabulary']>>(
      'books.vocabulary',
      row.vocabulary,
    ),
    alternateEnding: parseJsonColumn<NonNullable<Book['alternateEnding']>>(
      'books.alternateEnding',
      row.alternateEnding,
    ),
    endingAudioPathsA: parseJsonColumn<NonNullable<Book['endingAudioPathsA']>>(
      'books.endingAudioPathsA',
      row.endingAudioPathsA,
    ),
    endingAudioPathsB: parseJsonColumn<NonNullable<Book['endingAudioPathsB']>>(
      'books.endingAudioPathsB',
      row.endingAudioPathsB,
    ),
    funFacts: parseJsonColumn<NonNullable<Book['funFacts']>>(
      'books.funFacts',
      row.funFacts,
    ),
    intake: parseJsonColumn<NonNullable<Book['intake']>>(
      'books.intake',
      row.intake,
    ),
    missions: parseJsonColumn<NonNullable<Book['missions']>>(
      'books.missions',
      row.missions,
    ),
  };
}

export interface BookFilter {
  profileId: number;
  age?: number;
  cefr?: CefrLevel;
  /** 제목·주제 부분 일치. utf8mb4_unicode_ci 콜레이션으로 기본 case-insensitive. */
  q?: string;
}

export async function listBooks(filter: BookFilter): Promise<Book[]> {
  const conditions = [
    eq(books.profileId, filter.profileId),
    isNull(books.deletedAt),
    isNull(books.flaggedAt),
  ];
  if (filter.age !== undefined) conditions.push(eq(books.age, filter.age));
  if (filter.cefr !== undefined) conditions.push(eq(books.cefr, filter.cefr));
  if (filter.q) {
    const needle = `%${filter.q.trim()}%`;
    conditions.push(or(like(books.title, needle), like(books.topic, needle))!);
  }
  const rows = await db
    .select()
    .from(books)
    .where(and(...conditions))
    .orderBy(desc(books.createdAt));
  return rows.map(normalizeBookJsonFields);
}

/** 단건 조회 — soft-deleted도 포함(복원/감사 용도). 책장 UI는 listBooks 사용. */
export async function getBookById(id: number): Promise<Book | undefined> {
  const [row] = await db.select().from(books).where(eq(books.id, id)).limit(1);
  return row ? normalizeBookJsonFields(row) : undefined;
}

export async function updateBook(
  id: number,
  patch: Partial<Pick<Book, 'title' | 'topic' | 'coverImagePath'>>,
): Promise<Book | undefined> {
  await db.update(books).set(patch).where(eq(books.id, id));
  return getBookById(id);
}

/**
 * 결말 분기 passages의 사전 합성된 TTS 경로 배열을 books에 저장.
 * branch별로 독립 호출 — 한쪽 합성이 끝났을 때 먼저 반영하고 다른 쪽은 이어서.
 * orderIndex 순으로 정렬된 webPath 문자열 배열 (실패 슬롯은 '').
 */
export async function updateBookEndingAudioPaths(
  id: number,
  branch: 'A' | 'B',
  paths: string[],
): Promise<void> {
  const patch =
    branch === 'A'
      ? { endingAudioPathsA: paths }
      : { endingAudioPathsB: paths };
  await db.update(books).set(patch).where(eq(books.id, id));
}

export async function softDeleteBook(id: number): Promise<Book | undefined> {
  await db
    .update(books)
    .set({ deletedAt: new Date() })
    .where(eq(books.id, id));
  return getBookById(id);
}

export async function flagBook(
  id: number,
  reason: string,
): Promise<Book | undefined> {
  // flagged_reason 컬럼이 varchar(500)이므로 상한에 맞춰 절삭.
  // API 경계(Zod max 500) 외 내부 호출도 방어.
  await db
    .update(books)
    .set({ flaggedAt: new Date(), flaggedReason: reason.slice(0, 500) })
    .where(eq(books.id, id));
  return getBookById(id);
}

export async function unflagBook(id: number): Promise<Book | undefined> {
  await db
    .update(books)
    .set({ flaggedAt: null, flaggedReason: null })
    .where(eq(books.id, id));
  return getBookById(id);
}

export async function listFlaggedBooksByProfile(
  profileId: number,
): Promise<Book[]> {
  const rows = await db
    .select()
    .from(books)
    .where(
      and(
        eq(books.profileId, profileId),
        isNull(books.deletedAt),
        isNotNull(books.flaggedAt),
      ),
    )
    .orderBy(desc(books.flaggedAt));
  return rows.map(normalizeBookJsonFields);
}

/** 동화 1편을 트랜잭션으로 books + passages 동시 삽입. */
export async function insertBookWithPassages(
  book: NewBook,
  passageRows: Omit<NewPassage, 'bookId'>[],
): Promise<Book> {
  return db.transaction(async (tx) => {
    const [{ id }] = await tx.insert(books).values(book).$returningId();
    if (passageRows.length > 0) {
      await tx
        .insert(passages)
        .values(passageRows.map((p) => ({ ...p, bookId: id })));
    }
    const [row] = await tx
      .select()
      .from(books)
      .where(eq(books.id, id))
      .limit(1);
    if (!row) throw new Error('Inserted book not found');
    return normalizeBookJsonFields(row);
  });
}

export interface VocabEntry {
  word: string;
  meaning: string;
  bookId: number;
  bookTitle: string;
}

export async function listVocabularyByProfile(
  profileId: number,
): Promise<VocabEntry[]> {
  const rows = await db
    .select({
      id: books.id,
      title: books.title,
      vocabulary: books.vocabulary,
      createdAt: books.createdAt,
    })
    .from(books)
    .where(and(eq(books.profileId, profileId), isNull(books.deletedAt)))
    .orderBy(desc(books.createdAt));

  const out: VocabEntry[] = [];
  for (const r of rows) {
    // mysql2 typeCast가 우회돼 vocabulary가 string으로 도착하는 사고가 있어
    // (2026-04-26) 서버에서도 한 번 더 정규화한다. 이미 array면 그대로
    // 통과하고, string이면 JSON.parse, 실패 시 에러를 표면화한다.
    const vocab = parseJsonColumn<VocabularyEntry[]>(
      'books.vocabulary',
      r.vocabulary,
    );
    if (!vocab || !Array.isArray(vocab)) continue;
    for (const v of vocab) {
      if (!v?.word || !v?.meaning) continue;
      out.push({
        word: v.word,
        meaning: v.meaning,
        bookId: r.id,
        bookTitle: r.title,
      });
    }
  }
  return out;
}
