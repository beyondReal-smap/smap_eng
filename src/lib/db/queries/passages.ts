import { asc, eq } from 'drizzle-orm';
import { db } from '../index';
import { passages, type Passage } from '../schema';

// ===== Passages =====

export async function listPassagesByBook(bookId: number): Promise<Passage[]> {
  return db
    .select()
    .from(passages)
    .where(eq(passages.bookId, bookId))
    .orderBy(asc(passages.orderIndex));
}

async function getPassageById(
  passageId: number,
): Promise<Passage | undefined> {
  const [row] = await db
    .select()
    .from(passages)
    .where(eq(passages.id, passageId))
    .limit(1);
  return row;
}

export async function updatePassageAudio(
  passageId: number,
  audioPath: string,
): Promise<Passage | undefined> {
  await db
    .update(passages)
    .set({ audioPath })
    .where(eq(passages.id, passageId));
  return getPassageById(passageId);
}

export async function updatePassageImage(
  passageId: number,
  sceneImagePath: string,
): Promise<Passage | undefined> {
  await db
    .update(passages)
    .set({ sceneImagePath })
    .where(eq(passages.id, passageId));
  return getPassageById(passageId);
}
