import { eq } from 'drizzle-orm';
import { db } from '../index';
import { readingLogs, type NewReadingLog, type ReadingLog } from '../schema';

// ===== Reading logs =====

export async function createReadingLog(
  data: NewReadingLog,
): Promise<ReadingLog> {
  const [{ id }] = await db.insert(readingLogs).values(data).$returningId();
  const [row] = await db
    .select()
    .from(readingLogs)
    .where(eq(readingLogs.id, id))
    .limit(1);
  if (!row) throw new Error('Inserted reading log not found');
  return row;
}

export async function updateReadingLog(
  id: number,
  patch: Partial<Pick<ReadingLog, 'progressRatio' | 'finishedAt' | 'quizScore'>>,
): Promise<ReadingLog | undefined> {
  await db.update(readingLogs).set(patch).where(eq(readingLogs.id, id));
  const [row] = await db
    .select()
    .from(readingLogs)
    .where(eq(readingLogs.id, id))
    .limit(1);
  return row;
}

export async function getReadingLogById(
  id: number,
): Promise<ReadingLog | undefined> {
  const [row] = await db
    .select()
    .from(readingLogs)
    .where(eq(readingLogs.id, id))
    .limit(1);
  return row;
}
