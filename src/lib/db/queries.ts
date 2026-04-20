import { and, asc, desc, eq } from 'drizzle-orm';
import { db } from './index';
import {
  books,
  passages,
  profiles,
  quizzes,
  readingLogs,
  type Book,
  type CefrLevel,
  type NewBook,
  type NewPassage,
  type NewProfile,
  type NewQuiz,
  type NewReadingLog,
  type Passage,
  type Profile,
  type Quiz,
  type ReadingLog,
} from './schema';

// ------- Profiles -------

export function listProfiles(): Profile[] {
  return db.select().from(profiles).orderBy(asc(profiles.createdAt)).all();
}

export function createProfile(data: NewProfile): Profile {
  return db.insert(profiles).values(data).returning().get();
}

// ------- Books -------

export interface BookFilter {
  profileId: number;
  age?: number;
  cefr?: CefrLevel;
}

export function listBooks(filter: BookFilter): Book[] {
  const conditions = [eq(books.profileId, filter.profileId)];
  if (filter.age !== undefined) conditions.push(eq(books.age, filter.age));
  if (filter.cefr !== undefined) conditions.push(eq(books.cefr, filter.cefr));
  return db
    .select()
    .from(books)
    .where(and(...conditions))
    .orderBy(desc(books.createdAt))
    .all();
}

export function getBookById(id: number): Book | undefined {
  return db.select().from(books).where(eq(books.id, id)).get();
}

/** 동화 1편을 트랜잭션으로 books + passages 동시 삽입. */
export function insertBookWithPassages(
  book: NewBook,
  passageRows: Omit<NewPassage, 'bookId'>[],
): Book {
  return db.transaction((tx) => {
    const inserted = tx.insert(books).values(book).returning().get();
    if (passageRows.length > 0) {
      tx.insert(passages)
        .values(passageRows.map((p) => ({ ...p, bookId: inserted.id })))
        .run();
    }
    return inserted;
  });
}

// ------- Passages -------

export function listPassagesByBook(bookId: number): Passage[] {
  return db
    .select()
    .from(passages)
    .where(eq(passages.bookId, bookId))
    .orderBy(asc(passages.orderIndex))
    .all();
}

export function updatePassageAudio(
  passageId: number,
  audioPath: string,
): Passage | undefined {
  return db
    .update(passages)
    .set({ audioPath })
    .where(eq(passages.id, passageId))
    .returning()
    .get();
}

export function updatePassageImage(
  passageId: number,
  sceneImagePath: string,
): Passage | undefined {
  return db
    .update(passages)
    .set({ sceneImagePath })
    .where(eq(passages.id, passageId))
    .returning()
    .get();
}

// ------- Quizzes -------

export function listQuizzesByBook(bookId: number): Quiz[] {
  return db
    .select()
    .from(quizzes)
    .where(eq(quizzes.bookId, bookId))
    .orderBy(asc(quizzes.orderIndex))
    .all();
}

export function insertQuizzes(
  bookId: number,
  items: Omit<NewQuiz, 'bookId'>[],
): void {
  if (items.length === 0) return;
  db.insert(quizzes)
    .values(items.map((q) => ({ ...q, bookId })))
    .run();
}

// ------- Reading logs -------

export function createReadingLog(data: NewReadingLog): ReadingLog {
  return db.insert(readingLogs).values(data).returning().get();
}

export function updateReadingLog(
  id: number,
  patch: Partial<
    Pick<ReadingLog, 'progressRatio' | 'finishedAt' | 'quizScore'>
  >,
): ReadingLog | undefined {
  return db
    .update(readingLogs)
    .set(patch)
    .where(eq(readingLogs.id, id))
    .returning()
    .get();
}

export function listLogsByProfile(profileId: number): ReadingLog[] {
  return db
    .select()
    .from(readingLogs)
    .where(eq(readingLogs.profileId, profileId))
    .orderBy(desc(readingLogs.startedAt))
    .all();
}
