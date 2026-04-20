import { NextRequest, NextResponse } from 'next/server';
import { mkdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { eq } from 'drizzle-orm';
import { db, schema } from '@/lib/db';
import { buildCoverPrompt, generateImage, ImageError } from '@/lib/image/flux';
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
 * 책 표지 이미지를 생성·캐싱하고 웹 경로를 돌려준다. 멱등.
 * 첫 호출은 모델 로드/다운로드로 1~5분 걸릴 수 있다 (Apple Silicon, Q4).
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ bookId: string }> },
) {
  try {
    const { bookId: raw } = await params;
    const bookId = Number(raw);
    if (!Number.isInteger(bookId) || bookId <= 0) {
      return NextResponse.json({ error: 'invalid_id' }, { status: 400 });
    }

    const book = db
      .select()
      .from(schema.books)
      .where(eq(schema.books.id, bookId))
      .get();
    if (!book) {
      return NextResponse.json({ error: 'book_not_found' }, { status: 404 });
    }

    const { abs, webPath } = coverFileFor(bookId);
    if (book.coverImagePath && (await fileExists(abs))) {
      return NextResponse.json({
        bookId,
        coverImagePath: book.coverImagePath,
        cached: true,
      });
    }

    const prompt = buildCoverPrompt(book.title, book.topic ?? undefined);

    let png: Uint8Array;
    try {
      png = await generateImage({
        prompt,
        width: 1024,
        height: 768,
        steps: 4, // schnell은 4 스텝이면 충분
        seed: bookId, // 동일 책은 같은 결과 재현
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

    db.update(schema.books)
      .set({ coverImagePath: webPath })
      .where(eq(schema.books.id, bookId))
      .run();

    return NextResponse.json(
      {
        bookId,
        coverImagePath: webPath,
        cached: false,
        bytes: png.byteLength,
        prompt,
      },
      { status: 201 },
    );
  } catch (err) {
    return handleApiError(err);
  }
}
