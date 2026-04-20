import { NextRequest, NextResponse } from 'next/server';
import { mkdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { eq } from 'drizzle-orm';
import { db, schema } from '@/lib/db';
import { buildSceneprompt, generateImage, ImageError } from '@/lib/image/flux';
import { updatePassageImage } from '@/lib/db/queries';
import { handleApiError } from '../../../_lib/errors';

export const runtime = 'nodejs';

function sceneFileFor(passageId: number): { abs: string; webPath: string } {
  const filename = `passage-${passageId}-scene.png`;
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
 * 특정 passage의 장면 삽화를 생성·캐싱하고 웹 경로를 돌려준다. 멱등.
 * FLUX 생성은 M2 Pro 기준 한 장에 30초~1분 소요.
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ passageId: string }> },
) {
  try {
    const { passageId: raw } = await params;
    const passageId = Number(raw);
    if (!Number.isInteger(passageId) || passageId <= 0) {
      return NextResponse.json({ error: 'invalid_id' }, { status: 400 });
    }

    const passage = db
      .select()
      .from(schema.passages)
      .where(eq(schema.passages.id, passageId))
      .get();
    if (!passage) {
      return NextResponse.json({ error: 'passage_not_found' }, { status: 404 });
    }

    const { abs, webPath } = sceneFileFor(passageId);
    if (passage.sceneImagePath && (await fileExists(abs))) {
      return NextResponse.json({
        passageId,
        sceneImagePath: passage.sceneImagePath,
        cached: true,
      });
    }

    // 책의 topic도 프롬프트에 포함 (맥락 유지)
    const book = db
      .select()
      .from(schema.books)
      .where(eq(schema.books.id, passage.bookId))
      .get();

    const prompt = buildSceneprompt(passage.textEn, book?.topic ?? undefined);

    let png: Uint8Array;
    try {
      png = await generateImage({
        prompt,
        width: 1024,
        height: 768,
        steps: 4,
        seed: passageId,
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
    updatePassageImage(passageId, webPath);

    return NextResponse.json(
      {
        passageId,
        sceneImagePath: webPath,
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
