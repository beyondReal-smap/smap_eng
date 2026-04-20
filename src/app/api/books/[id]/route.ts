import { NextRequest, NextResponse } from 'next/server';
import { getBookById, listPassagesByBook } from '@/lib/db/queries';
import { handleApiError } from '../../_lib/errors';

export const runtime = 'nodejs';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const numericId = Number(id);
    if (!Number.isInteger(numericId) || numericId <= 0) {
      return NextResponse.json({ error: 'invalid_id' }, { status: 400 });
    }
    const book = getBookById(numericId);
    if (!book) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({
      book,
      passages: listPassagesByBook(book.id),
    });
  } catch (err) {
    return handleApiError(err);
  }
}
