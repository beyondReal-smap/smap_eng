import { NextRequest, NextResponse } from 'next/server';
import { mkdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { eq } from 'drizzle-orm';
import { db, schema } from '@/lib/db';
import { updatePassageAudio } from '@/lib/db/queries';
import { synthesize, TtsError } from '@/lib/tts/kokoro';
import { handleApiError } from '../../_lib/errors';

export const runtime = 'nodejs';

// /public/audio/ 에 저장해 Next.js 정적 서빙으로 그대로 재생 가능.
// DB에는 웹 경로(/audio/passage-xx.wav)를 기록한다.
function audioFileFor(passageId: number): { abs: string; webPath: string } {
  const filename = `passage-${passageId}.wav`;
  const abs = path.resolve(process.cwd(), 'public', 'audio', filename);
  const webPath = `/audio/${filename}`;
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
 * 지정 passage의 TTS 오디오를 생성·캐싱하고 웹 경로(/audio/...)를 돌려준다.
 * 이미 audio_path가 있고 파일도 존재하면 재합성하지 않는다 (멱등).
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

    const { abs, webPath } = audioFileFor(passageId);

    if (passage.audioPath && (await fileExists(abs))) {
      return NextResponse.json({
        passageId,
        audioPath: passage.audioPath,
        cached: true,
      });
    }

    let wav: Uint8Array;
    try {
      wav = await synthesize({ text: passage.textEn });
    } catch (err) {
      if (err instanceof TtsError) {
        return NextResponse.json(
          { error: 'tts_upstream', message: err.message, status: err.status },
          { status: 502 },
        );
      }
      throw err;
    }

    await mkdir(path.dirname(abs), { recursive: true });
    await writeFile(abs, wav);
    updatePassageAudio(passageId, webPath);

    return NextResponse.json(
      {
        passageId,
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
