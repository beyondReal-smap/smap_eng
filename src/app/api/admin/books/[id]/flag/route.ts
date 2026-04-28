import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { flagBook, getBookById, unflagBook } from '@/lib/db/queries';
import { assertAdminApi } from '@/lib/auth/session';
import { handleApiError } from '@/app/api/_lib/errors';

export const runtime = 'nodejs';

function parseId(raw: string): number | null {
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
}

const FlagSchema = z.object({
  reason: z.string().trim().min(1).max(500),
});

/** POST /api/admin/books/[id]/flag — 어드민 권한으로 신고 처리. */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await assertAdminApi();
    const { id } = await params;
    const bookId = parseId(id);
    if (bookId === null) {
      return NextResponse.json({ error: 'invalid_id' }, { status: 400 });
    }
    const { reason } = FlagSchema.parse(await req.json());
    const existing = await getBookById(bookId);
    if (!existing) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    const book = await flagBook(bookId, reason);
    return NextResponse.json({ book });
  } catch (err) {
    return handleApiError(err);
  }
}

/** DELETE /api/admin/books/[id]/flag — 신고 철회. */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await assertAdminApi();
    const { id } = await params;
    const bookId = parseId(id);
    if (bookId === null) {
      return NextResponse.json({ error: 'invalid_id' }, { status: 400 });
    }
    const existing = await getBookById(bookId);
    if (!existing) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    const book = await unflagBook(bookId);
    return NextResponse.json({ book });
  } catch (err) {
    return handleApiError(err);
  }
}
