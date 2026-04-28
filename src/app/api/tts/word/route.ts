import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'node:crypto';
import { mkdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import { synthesize, TtsError } from '@/lib/tts/kokoro';
import { requireUserIdForApi } from '@/lib/auth/session';
import { handleApiError } from '../../_lib/errors';

export const runtime = 'nodejs';

/**
 * POST /api/tts/word   body: { text: string }
 *
 * 임의 단어·짧은 구를 Kokoro로 합성해 /public/audio/word-<slug>.wav 에 캐시.
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
    const filename = `word-${slug}.wav`;
    const abs = path.join(AUDIO_DIR, filename);
    const webPath = `/audio/${filename}`;

    if (await fileExists(abs)) {
      return NextResponse.json({ text, audioPath: webPath, cached: true });
    }

    let wav: Uint8Array;
    try {
      wav = await synthesize({ text });
    } catch (err) {
      if (err instanceof TtsError) {
        return NextResponse.json(
          { error: 'tts_upstream', message: err.message, status: err.status },
          { status: 502 },
        );
      }
      throw err;
    }

    await mkdir(AUDIO_DIR, { recursive: true });
    await writeFile(abs, wav);

    return NextResponse.json(
      {
        text,
        audioPath: webPath,
        cached: false,
        bytes: wav.byteLength,
      },
      { status: 201 },
    );
  } catch (err) {
    return handleApiError(err);
  }
}
