import { stat } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import path from 'node:path';
import { NextRequest } from 'next/server';
import {
  ApiAuthError,
  requireBookOwnershipForApi,
  requirePassageOwnershipForApi,
} from '@/lib/auth/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * 파일명 → 소유권 검증.
 *  - book-<id>-cover.png    → 책 소유권
 *  - passage-<id>-scene.png → passage 소유권
 *
 * BOLA: 비소유/비존재 → 404로 통일.
 */
async function authorizeImageFile(file: string): Promise<void> {
  const bookMatch = /^book-(\d+)-cover\.png$/.exec(file);
  if (bookMatch) {
    const id = Number(bookMatch[1]);
    if (!Number.isInteger(id) || id <= 0) {
      throw new ApiAuthError('not_found', 404);
    }
    await requireBookOwnershipForApi(id);
    return;
  }
  const passageMatch = /^passage-(\d+)-scene\.png$/.exec(file);
  if (passageMatch) {
    const id = Number(passageMatch[1]);
    if (!Number.isInteger(id) || id <= 0) {
      throw new ApiAuthError('not_found', 404);
    }
    await requirePassageOwnershipForApi(id);
    return;
  }
  throw new ApiAuthError('not_found', 404);
}

/**
 * `/images/:file` → 이 라우트로 rewrite. audio와 같은 이유(빌드 타임 스냅샷 우회).
 * FLUX가 생성한 표지/장면 PNG를 런타임 런에서도 서빙한다.
 */

// authorizeImageFile이 인식하는 두 형식과 1:1 정합 — 1차 게이트(FILE_RE)가
// 2차 게이트(authorize)보다 넓으면 향후 패턴 추가 시 검증 누락 여지가 생긴다.
const FILE_RE = /^(?:book-\d+-cover|passage-\d+-scene)\.png$/;
const IMAGE_DIR = path.resolve(process.cwd(), 'public', 'images');

function nodeStreamToWeb(filePath: string): ReadableStream {
  const node = createReadStream(filePath);
  return new ReadableStream({
    start(controller) {
      node.on('data', (chunk) => {
        controller.enqueue(
          typeof chunk === 'string' ? new TextEncoder().encode(chunk) : chunk,
        );
      });
      node.on('end', () => controller.close());
      node.on('error', (err) => controller.error(err));
    },
    cancel() {
      node.destroy();
    },
  });
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ file: string }> },
) {
  const { file } = await params;
  if (!FILE_RE.test(file)) {
    return new Response('not found', { status: 404 });
  }
  const abs = path.join(IMAGE_DIR, file);
  if (!abs.startsWith(IMAGE_DIR + path.sep)) {
    return new Response('not found', { status: 404 });
  }
  try {
    await authorizeImageFile(file);
  } catch (err) {
    if (err instanceof ApiAuthError) {
      return new Response('not found', { status: err.status });
    }
    throw err;
  }
  try {
    const s = await stat(abs);
    if (!s.isFile()) return new Response('not found', { status: 404 });
    // 인증 게이트를 통과한 사용자별 자원 → 공유 캐시 금지(private).
    // 약한 ETag로 만료 후 304 재검증(바디 재전송 차단), 재생성 시 mtime 변경으로 자동 무효화.
    const etag = `W/"${s.size.toString(16)}-${Math.floor(s.mtimeMs).toString(16)}"`;
    const headers = {
      'Content-Type': 'image/png',
      'Cache-Control': 'private, max-age=3600',
      ETag: etag,
    } as const;
    if (req.headers.get('if-none-match') === etag) {
      return new Response(null, { status: 304, headers });
    }
    return new Response(nodeStreamToWeb(abs), {
      status: 200,
      headers: { ...headers, 'Content-Length': String(s.size) },
    });
  } catch {
    return new Response('not found', { status: 404 });
  }
}
