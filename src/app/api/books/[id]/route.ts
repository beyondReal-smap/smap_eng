import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  getBookById,
  listPassagesByBook,
  softDeleteBook,
  updateBook,
} from '@/lib/db/queries';
import { requireBookOwnershipForApi } from '@/lib/auth/session';
import { handleApiError } from '../../_lib/errors';

export const runtime = 'nodejs';

/** URL의 [id] 파라미터를 정수로 변환. 잘못된 값이면 400. */
function parseId(raw: string): number | null {
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const bookId = parseId(id);
    if (bookId === null) {
      return NextResponse.json({ error: 'invalid_id' }, { status: 400 });
    }
    // 비소유/비존재 통합 404 — BOLA enumeration 방어.
    await requireBookOwnershipForApi(bookId);
    const book = await getBookById(bookId);
    if (!book) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({
      book,
      passages: await listPassagesByBook(book.id),
    });
  } catch (err) {
    return handleApiError(err);
  }
}

/**
 * 책 메타 수정.
 *  - title: 제목 수정 (1~120자)
 *  - topic: 주제 수정 또는 비움
 *  - coverImagePath: null 을 보내면 생성된 커버를 제거하고 seeded SVG 폴백으로 복귀.
 *    FLUX 재생성은 별도 라우트(P1)에서 처리.
 */
const PatchBookSchema = z
  .object({
    title: z.string().trim().min(1).max(120).optional(),
    topic: z.string().trim().max(80).nullable().optional(),
    coverImagePath: z.null().optional(), // 현재는 "제거"만 허용. 값 설정은 /regenerate-cover 경유.
  })
  .refine(
    (v) =>
      v.title !== undefined ||
      v.topic !== undefined ||
      v.coverImagePath !== undefined,
    { message: 'no_fields' },
  );

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const bookId = parseId(id);
    if (bookId === null) {
      return NextResponse.json({ error: 'invalid_id' }, { status: 400 });
    }
    const body = PatchBookSchema.parse(await req.json());
    await requireBookOwnershipForApi(bookId);
    const existing = await getBookById(bookId);
    if (!existing) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    const patch: Parameters<typeof updateBook>[1] = {};
    if (body.title !== undefined) patch.title = body.title;
    if (body.topic !== undefined) patch.topic = body.topic;
    if (body.coverImagePath === null) patch.coverImagePath = null;
    const book = await updateBook(bookId, patch);
    return NextResponse.json({ book });
  } catch (err) {
    return handleApiError(err);
  }
}

/**
 * 책 soft delete. 레코드는 유지되고 deleted_at 만 기록 →
 * 책장 목록(listBooks)에서 자동 제외. 실수 복원 여지를 남긴다.
 */
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
    const book = await softDeleteBook(bookId);
    return NextResponse.json({ book });
  } catch (err) {
    return handleApiError(err);
  }
}
