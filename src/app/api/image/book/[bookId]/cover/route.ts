import { NextRequest, NextResponse } from 'next/server';
import { mkdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { eq } from 'drizzle-orm';
import { db, schema } from '@/lib/db';
import { buildCoverPrompt, generateImage, ImageError } from '@/lib/image/flux';
import { requireBookOwnershipForApi } from '@/lib/auth/session';
import { handleApiError } from '../../../../_lib/errors';

export const runtime = 'nodejs';

function coverFileFor(bookId: number): { abs: string; webPath: string } {
  const filename = `book-${bookId}-cover.png`;
  const abs = path.resolve(process.cwd(), 'public', 'images', filename);
  const webPath = `/images/${filename}`;
  return { abs, webPath };
}

async function fileExists(p: string): Promise<boolean> {
  try {
    await stat(p);
    return true;
  } catch {
    return false;
  }
}

/**
 * 책 표지 이미지를 생성·캐싱하고 웹 경로를 돌려준다.
 *  - 기본: 멱등. 이미 coverImagePath가 있고 파일이 존재하면 그대로 반환.
 *  - body `{ "force": true }`: 기존 커버를 무시하고 새 seed로 재생성.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ bookId: string }> },
) {
  try {
    const { bookId: raw } = await params;
    const bookId = Number(raw);
    if (!Number.isInteger(bookId) || bookId <= 0) {
      return NextResponse.json({ error: 'invalid_id' }, { status: 400 });
    }
    await requireBookOwnershipForApi(bookId);

    // body는 선택. 본문이 비어 있으면 force=false로 간주.
    let force = false;
    try {
      const text = await req.text();
      if (text.trim()) {
        const parsed = JSON.parse(text);
        force = parsed?.force === true;
      }
    } catch {
      force = false;
    }

    const [book] = await db
      .select()
      .from(schema.books)
      .where(eq(schema.books.id, bookId))
      .limit(1);
    if (!book) {
      return NextResponse.json({ error: 'book_not_found' }, { status: 404 });
    }

    const { abs, webPath } = coverFileFor(bookId);
    if (!force && book.coverImagePath && (await fileExists(abs))) {
      return NextResponse.json({
        bookId,
        coverImagePath: book.coverImagePath,
        cached: true,
      });
    }

    const prompt = buildCoverPrompt(book.title, book.topic ?? undefined);
    // force=true일 때 seed를 현재 시각 기반으로 틀어 동일 책이라도 다른 결과.
    const seed = force ? ((bookId + Date.now()) & 0x7fffffff) >>> 0 : bookId;

    let png: Uint8Array;
    try {
      png = await generateImage({
        prompt,
        width: 1024,
        height: 768,
        steps: 4,
        seed,
      });
    } catch (err) {
      if (err instanceof ImageError) {
        return NextResponse.json(
          { error: 'image_upstream', message: err.message, status: err.status },
          { status: 502 },
        );
      }
      throw err;
    }

    await mkdir(path.dirname(abs), { recursive: true });
    await writeFile(abs, png);

    await db
      .update(schema.books)
      .set({ coverImagePath: webPath })
      .where(eq(schema.books.id, bookId));

    return NextResponse.json(
      {
        bookId,
        coverImagePath: webPath,
        cached: false,
        regenerated: force,
        bytes: png.byteLength,
        prompt,
      },
      { status: 201 },
    );
  } catch (err) {
    return handleApiError(err);
  }
}
