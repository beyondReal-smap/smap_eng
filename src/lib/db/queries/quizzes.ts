import { asc, eq } from 'drizzle-orm';
import { db } from '../index';
import { quizzes, type NewQuiz, type Quiz } from '../schema';
import { parseJsonColumn } from './_shared';

// ===== Quizzes =====

function normalizeQuizJsonFields(row: Quiz): Quiz {
  const choices = parseJsonColumn<Quiz['choices']>(
    'quizzes.choices',
    row.choices,
  );
  if (choices === null) {
    throw new Error(`Invalid JSON in quizzes.choices`);
  }
  return { ...row, choices };
}

export async function listQuizzesByBook(bookId: number): Promise<Quiz[]> {
  const rows = await db
    .select()
    .from(quizzes)
    .where(eq(quizzes.bookId, bookId))
    .orderBy(asc(quizzes.orderIndex));
  return rows.map(normalizeQuizJsonFields);
}

export async function insertQuizzes(
  bookId: number,
  items: Omit<NewQuiz, 'bookId'>[],
): Promise<void> {
  if (items.length === 0) return;
  await db.insert(quizzes).values(items.map((q) => ({ ...q, bookId })));
}
