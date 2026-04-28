import { NextRequest, NextResponse } from 'next/server';
import { adminRestoreBook, getBookById } from '@/lib/db/queries';
import { assertAdminApi } from '@/lib/auth/session';
import { handleApiError } from '@/app/api/_lib/errors';

export const runtime = 'nodejs';

function parseId(raw: string): number | null {
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
}

/** POST /api/admin/books/[id]/restore — soft delete 취소(deletedAt=null). */
export async function POST(
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
    const book = await adminRestoreBook(bookId);
    return NextResponse.json({ book });
  } catch (err) {
    return handleApiError(err);
  }
}
