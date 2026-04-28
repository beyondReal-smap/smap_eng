import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { flagBook, getBookById, unflagBook } from '@/lib/db/queries';
import { requireBookOwnershipForApi } from '@/lib/auth/session';
import { handleApiError } from '../../../_lib/errors';

export const runtime = 'nodejs';

function parseId(raw: string): number | null {
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
}

/**
 * POST /api/books/[id]/flag — body { reason: string }
 *   AI 생성 콘텐츠 문제 신고. 일반 책장에서 숨김, 보호자 모드에서만 검토·복원.
 *
 * DELETE /api/books/[id]/flag — 신고 철회(책장 복귀).
 */
const FlagSchema = z.object({
  reason: z.string().trim().min(1).max(120),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const bookId = parseId(id);
    if (bookId === null) {
      return NextResponse.json({ error: 'invalid_id' }, { status: 400 });
    }
    const { reason } = FlagSchema.parse(await req.json());
    await requireBookOwnershipForApi(bookId);
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

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const bookId = parseId(id);
    if (bookId === null) {
      return NextResponse.json({ error: 'invalid_id' }, { status: 400 });
    }
    await requireBookOwnershipForApi(bookId);
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
