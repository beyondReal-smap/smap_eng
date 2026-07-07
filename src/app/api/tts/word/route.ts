import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'node:crypto';
import { mkdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import { synthesize, TtsError } from '@/lib/tts/supertonic';
import { requireUserIdForApi } from '@/lib/auth/session';
import { handleApiError } from '../../_lib/errors';

export const runtime = 'nodejs';

/**
 * POST /api/tts/word   body: { text: string }
 *
 * 임의 단어·짧은 구를 Supertonic으로 합성해 /public/audio/word-<slug>.mp3 에 캐시.
 * 동일 텍스트는 파일명이 같아 멱등(같은 응답). 클라이언트는 반환된 audioPath로
 * 곧바로 <audio> 재생 가능.
 *
 * 단어장(VocabDeck)에서 영단어를 듣기 위해 사용. passage 단위 TTS는 기존
 * `/api/tts/[passageId]` 라우트가 담당한다.
 */

const AUDIO_DIR = path.resolve(process.cwd(), 'public', 'audio');

const Schema = z.object({
  text: z.string().trim().min(1).max(200),
});

async function fileExists(p: string): Promise<boolean> {
  try {
    await stat(p);
    return true;
  } catch {
    return false;
  }
}

interface WordAudio {
  audioPath: string;
  cached: boolean;
  bytes?: number;
}

// 동일 텍스트 동시 요청 병합 — 단어장에서 같은 단어를 연타하면 캐시 파일이
// 생기기 전에 두 요청이 모두 Supertonic을 때린다(합성이 가장 비싼 경로).
// persist.ts의 passage 단위 inFlight와 동일한 패턴 — 단일 프로세스 기준.
const inFlightWords = new Map<string, Promise<WordAudio>>();

function synthesizeWordOnce(text: string, slug: string): Promise<WordAudio> {
  const existing = inFlightWords.get(slug);
  if (existing) return existing;

  const promise = (async (): Promise<WordAudio> => {
    const filename = `word-${slug}.mp3`;
    const abs = path.join(AUDIO_DIR, filename);
    const webPath = `/audio/${filename}`;

    if (await fileExists(abs)) {
      return { audioPath: webPath, cached: true };
    }

    const wav = await synthesize({ text });
    await mkdir(AUDIO_DIR, { recursive: true });
    await writeFile(abs, wav);
    return { audioPath: webPath, cached: false, bytes: wav.byteLength };
  })();

  inFlightWords.set(slug, promise);
  // 성공/실패와 무관하게 제거 — 실패 시 다음 요청이 재시도할 수 있게 한다.
  promise.finally(() => inFlightWords.delete(slug)).catch(() => void 0);
  return promise;
}

/**
 * 텍스트 → 파일 슬러그.
 * 정규화된 텍스트를 문자에 따라 slug화하되, 최종 파일명은 해시 suffix로 고유성 보장.
 *  - 전체 해시(SHA-1 앞 10자리)로 충돌 최소화
 *  - 가독성을 위해 알파벳/숫자 앞 16자만 prefix로 결합
 */
function audioSlug(text: string): string {
  const norm = text.trim().toLowerCase();
  const prefix = norm
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 16);
  const hash = createHash('sha1').update(norm).digest('hex').slice(0, 10);
  return prefix ? `${prefix}-${hash}` : hash;
}

export async function POST(req: NextRequest) {
  try {
    // 단어 TTS는 단어장 내 임의 단어로 호출되므로 ownership 단위가 없음.
    // 최소한 인증을 강제해 외부 익명 호출(리소스 남용)을 차단한다.
    await requireUserIdForApi();
    const { text } = Schema.parse(await req.json());
    const slug = audioSlug(text);

    let result: WordAudio;
    try {
      result = await synthesizeWordOnce(text, slug);
    } catch (err) {
      if (err instanceof TtsError) {
        return NextResponse.json(
          { error: 'tts_upstream', message: err.message, status: err.status },
          { status: 502 },
        );
      }
      throw err;
    }

    return NextResponse.json(
      {
        text,
        audioPath: result.audioPath,
        cached: result.cached,
        ...(result.bytes !== undefined ? { bytes: result.bytes } : {}),
      },
      { status: result.cached ? 200 : 201 },
    );
  } catch (err) {
    return handleApiError(err);
  }
}
