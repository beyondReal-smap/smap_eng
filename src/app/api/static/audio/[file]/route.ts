import { createReadStream, statSync } from 'node:fs';
import { stat } from 'node:fs/promises';
import path from 'node:path';
import { NextRequest } from 'next/server';
import {
  ApiAuthError,
  requireBookOwnershipForApi,
  requirePassageOwnershipForApi,
  requireUserIdForApi,
} from '@/lib/auth/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * 파일명 → 소유권 검증. (확장자는 신규 .mp3 + 구버전 캐시 .wav 모두 허용)
 *  - passage-<id>.(mp3|wav) → 해당 passage가 현재 user 소유여야 함
 *  - ending-<bookId>-<A|B>-<idx>.(mp3|wav) → 해당 book이 현재 user 소유여야 함
 *  - word-<slug>.(mp3|wav) → 단어 TTS는 ownership 단위가 없음. 인증만 강제(슬러그 enumeration 위험은
 *    SHA-1 해시 suffix로 추측 어려움 + 무작위 단어로 재합성 가능 — 인증만으로 충분).
 *
 * BOLA 회피: 비소유/비존재 → 404 (`not found`)로 통일. 통상 응답과 동일 텍스트.
 */
async function authorizeAudioFile(file: string): Promise<void> {
  const passageMatch = /^passage-(\d+)\.(?:wav|mp3)$/.exec(file);
  if (passageMatch) {
    const id = Number(passageMatch[1]);
    if (!Number.isInteger(id) || id <= 0) {
      throw new ApiAuthError('not_found', 404);
    }
    await requirePassageOwnershipForApi(id);
    return;
  }
  const endingMatch = /^ending-(\d+)-[AB]-\d+\.(?:wav|mp3)$/.exec(file);
  if (endingMatch) {
    const bookId = Number(endingMatch[1]);
    if (!Number.isInteger(bookId) || bookId <= 0) {
      throw new ApiAuthError('not_found', 404);
    }
    await requireBookOwnershipForApi(bookId);
    return;
  }
  if (/^word-[a-z0-9_-]{1,80}\.(?:wav|mp3)$/.test(file)) {
    await requireUserIdForApi();
    return;
  }
  throw new ApiAuthError('not_found', 404);
}

/** ApiAuthError → 404 응답 (HTML 응답 흐름과 어긋나지 않게 텍스트로). */
function authErrorToResponse(err: unknown): Response | null {
  if (err instanceof ApiAuthError) {
    return new Response('not found', { status: err.status });
  }
  return null;
}

/**
 * `/audio/:file` → 이 라우트로 rewrite.
 * Next.js 16 Turbopack이 빌드 타임 이후 생성된 public 파일을 404로 처리하는 문제를 우회.
 *
 * 보안:
 *  - 파일명은 FILE_RE의 세 가지 형식만 허용(경로 탈출 방지).
 *  - 실제 파일은 프로젝트 루트의 `public/audio/` 안에서만 접근.
 *
 * HTTP Range:
 *  - <audio controls>는 대부분 Range 요청으로 seek한다. 206 Partial Content 지원.
 */

// passage-<id> | ending-<bookId>-<A|B>-<idx> | word-<slug> 형식만 허용.
// 확장자는 신규 .mp3 + 구버전 캐시 .wav. ending은 결말 분기 사전 합성 파일 —
// 기존 정규식에 빠져 있어 결말 오디오가 404로 떨어지던 버그를 함께 수정.
// word 슬러그는 소문자·숫자·밑줄·하이픈만. 경로 탈출·예상 외 확장자 차단.
const FILE_RE =
  /^(?:passage-\d+|ending-\d+-[AB]-\d+|word-[a-z0-9_-]{1,80})\.(?:wav|mp3)$/;
const AUDIO_DIR = path.resolve(process.cwd(), 'public', 'audio');

// 확장자별 Content-Type — 구버전 .wav와 신규 .mp3가 공존한다.
function contentTypeFor(file: string): string {
  return file.endsWith('.mp3') ? 'audio/mpeg' : 'audio/wav';
}

function parseRange(header: string | null, size: number) {
  if (!header) return null;
  const m = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!m) return null;
  let start = m[1] ? Number(m[1]) : 0;
  let end = m[2] ? Number(m[2]) : size - 1;
  if (Number.isNaN(start) || Number.isNaN(end) || start > end || end >= size) {
    return null;
  }
  if (m[1] === '' && m[2] !== '') {
    // suffix range: bytes=-500 → 마지막 500 bytes
    start = Math.max(0, size - Number(m[2]));
    end = size - 1;
  }
  return { start, end };
}

/**
 * Node.js ReadStream → Web ReadableStream.
 * Next.js Response가 Web stream을 요구하므로 변환.
 */
function nodeStreamToWeb(
  filePath: string,
  opts?: { start?: number; end?: number },
): ReadableStream {
  const node = createReadStream(filePath, opts);
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
  const rangeHeader = req.headers.get('range');
  if (!FILE_RE.test(file)) {
    console.warn(`[audio:get] invalid_filename file=${file}`);
    return new Response('not found', { status: 404 });
  }
  const abs = path.join(AUDIO_DIR, file);
  // path traversal 2차 방어
  if (!abs.startsWith(AUDIO_DIR + path.sep)) {
    console.warn(`[audio:get] path_traversal file=${file}`);
    return new Response('not found', { status: 404 });
  }
  try {
    await authorizeAudioFile(file);
  } catch (err) {
    if (err instanceof ApiAuthError) {
      console.warn(
        `[audio:get] auth_fail file=${file} status=${err.status} msg=${err.message}`,
      );
      return new Response('not found', { status: err.status });
    }
    console.error(`[audio:get] auth_throw file=${file} err=`, err);
    throw err;
  }
  try {
    const s = await stat(abs);
    if (!s.isFile()) {
      console.warn(`[audio:get] not_file file=${file}`);
      return new Response('not found', { status: 404 });
    }

    const size = s.size;
    const range = parseRange(rangeHeader, size);

    // 약한 ETag(size+mtime). 내용이 같으면 만료 후에도 304로 바디 재전송을 막고,
    // force 재합성으로 wav가 바뀌면 mtime이 갱신돼 ETag도 달라져 자동 무효화된다.
    // 인증 게이트를 통과한 사용자별 자원이므로 공유 캐시 금지(private).
    const etag = `W/"${size.toString(16)}-${Math.floor(s.mtimeMs).toString(16)}"`;
    const commonHeaders = {
      'Content-Type': contentTypeFor(file),
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'private, max-age=3600',
      ETag: etag,
    } as const;

    // 조건부 요청은 Range 없는 전체 GET에서만 304로 단축(부분 응답과 충돌 방지).
    if (!range && req.headers.get('if-none-match') === etag) {
      console.log(`[audio:get] 304 file=${file}`);
      return new Response(null, { status: 304, headers: commonHeaders });
    }

    if (range) {
      const { start, end } = range;
      const length = end - start + 1;
      console.log(
        `[audio:get] 206 file=${file} size=${size} range=${start}-${end} len=${length}`,
      );
      return new Response(nodeStreamToWeb(abs, { start, end }), {
        status: 206,
        headers: {
          ...commonHeaders,
          'Content-Range': `bytes ${start}-${end}/${size}`,
          'Content-Length': String(length),
        },
      });
    }

    console.log(
      `[audio:get] 200 file=${file} size=${size} range_header=${rangeHeader ?? '-'}`,
    );
    return new Response(nodeStreamToWeb(abs), {
      status: 200,
      headers: {
        ...commonHeaders,
        'Content-Length': String(size),
      },
    });
  } catch (err) {
    console.error(`[audio:get] stat_fail file=${file} err=`, err);
    return new Response('not found', { status: 404 });
  }
}

// HEAD 지원: <audio> 일부 브라우저가 먼저 HEAD로 메타만 조회.
export async function HEAD(
  _req: NextRequest,
  { params }: { params: Promise<{ file: string }> },
) {
  const { file } = await params;
  if (!FILE_RE.test(file)) return new Response(null, { status: 404 });
  try {
    await authorizeAudioFile(file);
  } catch (err) {
    if (err instanceof ApiAuthError) {
      return new Response(null, { status: err.status });
    }
    throw err;
  }
  const abs = path.join(AUDIO_DIR, file);
  try {
    const s = statSync(abs);
    const etag = `W/"${s.size.toString(16)}-${Math.floor(s.mtimeMs).toString(16)}"`;
    return new Response(null, {
      status: 200,
      headers: {
        'Content-Type': contentTypeFor(file),
        'Content-Length': String(s.size),
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'private, max-age=3600',
        ETag: etag,
      },
    });
  } catch {
    return new Response(null, { status: 404 });
  }
}
