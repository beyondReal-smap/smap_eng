import { stat } from 'node:fs/promises';
import path from 'node:path';
import { NextRequest, NextResponse } from 'next/server';
import { getBookById, listPassagesByBook } from '@/lib/db/queries';
import { requireBookOwnershipForApi } from '@/lib/auth/session';
import { handleApiError } from '@/app/api/_lib/errors';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface PackMedia {
  path: string;
  bytes: number;
  etagOrSha: string;
}

function parseId(raw: string): number | null {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function resolveMediaPath(webPath: string): string | null {
  const audio = /^\/audio\/((?:passage-\d+|ending-\d+-[AB]-\d+)\.(?:wav|mp3))$/.exec(
    webPath,
  );
  if (audio) {
    return path.resolve(process.cwd(), 'public', 'audio', audio[1]);
  }

  const image = /^\/images\/((?:book-\d+-cover|passage-\d+-scene)\.png)$/.exec(
    webPath,
  );
  if (image) {
    return path.resolve(process.cwd(), 'public', 'images', image[1]);
  }

  return null;
}

async function describeMedia(webPath: string): Promise<PackMedia | null> {
  const absolutePath = resolveMediaPath(webPath);
  if (!absolutePath) return null;

  try {
    const file = await stat(absolutePath);
    if (!file.isFile()) return null;
    return {
      path: webPath,
      bytes: file.size,
      // static/audio·images 라우트와 같은 size+mtime 약한 ETag 계약이다.
      etagOrSha: `W/"${file.size.toString(16)}-${Math.floor(file.mtimeMs).toString(16)}"`,
    };
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === 'ENOENT' || code === 'ENOTDIR') return null;
    throw err;
  }
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

    await requireBookOwnershipForApi(bookId);
    const book = await getBookById(bookId);
    if (!book) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }

    const passages = await listPassagesByBook(bookId);
    const paths = new Set<string>();
    const endingPathPattern = new RegExp(
      `^/audio/ending-${bookId}-[AB]-\\d+\\.(?:wav|mp3)$`,
    );
    if (book.coverImagePath === `/images/book-${bookId}-cover.png`) {
      paths.add(book.coverImagePath);
    }
    for (const passage of passages) {
      if (
        passage.audioPath === `/audio/passage-${passage.id}.mp3` ||
        passage.audioPath === `/audio/passage-${passage.id}.wav`
      ) {
        paths.add(passage.audioPath);
      }
      if (
        passage.sceneImagePath === `/images/passage-${passage.id}-scene.png`
      ) {
        paths.add(passage.sceneImagePath);
      }
    }
    for (const endingPath of [
      ...(book.endingAudioPathsA ?? []),
      ...(book.endingAudioPathsB ?? []),
    ]) {
      if (
        endingPath &&
        endingPathPattern.test(endingPath)
      ) {
        paths.add(endingPath);
      }
    }

    const described = await Promise.all([...paths].map(describeMedia));
    const media = described.filter((item): item is PackMedia => item !== null);

    return NextResponse.json(
      { book, passages, media },
      { headers: { 'Cache-Control': 'private, no-store' } },
    );
  } catch (err) {
    return handleApiError(err);
  }
}
