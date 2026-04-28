import { NextRequest, NextResponse } from 'next/server';
import {
  PassageNotFoundError,
  synthesizePassage,
  TtsError,
} from '@/lib/tts/persist';
import { requirePassageOwnershipForApi } from '@/lib/auth/session';
import { handleApiError } from '../../_lib/errors';

export const runtime = 'nodejs';

/**
 * 지정 passage의 TTS 오디오를 생성·캐싱하고 웹 경로(/audio/...)를 돌려준다.
 * 파일이 이미 있으면 재합성하지 않는다(멱등). 배치 생성과 동일한 공통 헬퍼를 호출해
 * 두 경로가 동시에 들어와도 Kokoro는 한 번만 실행된다.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ passageId: string }> },
) {
  const t0 = Date.now();
  let passageIdForLog: number | string = 'unknown';
  try {
    const { passageId: raw } = await params;
    const passageId = Number(raw);
    passageIdForLog = passageId;
    if (!Number.isInteger(passageId) || passageId <= 0) {
      console.warn(`[tts:api] invalid_id raw=${raw}`);
      return NextResponse.json({ error: 'invalid_id' }, { status: 400 });
    }
    await requirePassageOwnershipForApi(passageId);

    // ?force=1 — reader의 다시듣기/자동복구가 깨진 wav를 재생성할 때 사용.
    // '1'/'true' 모두 허용해 향후 클라이언트 변경에 관대하게.
    const forceParam = req.nextUrl.searchParams.get('force');
    const force = forceParam === '1' || forceParam === 'true';
    console.log(`[tts:api] start passage=${passageId} force=${force}`);

    try {
      const result = await synthesizePassage(passageId, { force });
      const ms = Date.now() - t0;
      console.log(
        `[tts:api] ok passage=${passageId} force=${force} cached=${result.cached} bytes=${result.bytes ?? '-'} ${ms}ms`,
      );
      return NextResponse.json(
        {
          passageId,
          audioPath: result.audioPath,
          cached: result.cached,
          ...(result.bytes !== undefined ? { bytes: result.bytes } : {}),
        },
        { status: result.cached ? 200 : 201 },
      );
    } catch (err) {
      if (err instanceof PassageNotFoundError) {
        console.warn(`[tts:api] passage_not_found passage=${passageId}`);
        return NextResponse.json(
          { error: 'passage_not_found' },
          { status: 404 },
        );
      }
      if (err instanceof TtsError) {
        console.error(
          `[tts:api] upstream_fail passage=${passageId} status=${err.status} msg=${err.message}`,
        );
        return NextResponse.json(
          { error: 'tts_upstream', message: err.message, status: err.status },
          { status: 502 },
        );
      }
      throw err;
    }
  } catch (err) {
    console.error(
      `[tts:api] handler_throw passage=${passageIdForLog} err=`,
      err,
    );
    return handleApiError(err);
  }
}
