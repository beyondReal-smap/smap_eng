// 한 passage에 대해 TTS를 합성·저장·DB기록까지 묶어서 수행하는 공통 헬퍼.
// /api/tts/[passageId] 라우트와 배치 생성기가 같은 함수를 쓰도록 하여 중복 호출을
// 하나의 Promise로 병합한다(Supertonic이 같은 문장을 두 번 처리하지 않도록).
import { mkdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { eq } from 'drizzle-orm';
import { db, schema } from '@/lib/db';
import { updatePassageAudio } from '@/lib/db/queries';
import { synthesize, TtsError } from './supertonic';

export { TtsError };

export interface PersistedAudio {
  audioPath: string;
  cached: boolean;
  bytes?: number;
}

// /public/audio/passage-<id>.mp3 — /audio rewrite 라우트로 서빙.
// 구버전 책의 .wav 경로는 DB audioPath에 그대로 남아 라우트가 계속 서빙한다.
function audioFileFor(passageId: number): { abs: string; webPath: string } {
  const filename = `passage-${passageId}.mp3`;
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

// passage 단위 in-flight 병합 — 배치와 on-demand가 동시에 같은 id를 요청해도
// Supertonic은 한 번만 때리고, 호출자들은 동일한 Promise를 await한다.
const inFlight = new Map<number, Promise<PersistedAudio>>();

export class PassageNotFoundError extends Error {
  constructor(readonly passageId: number) {
    super(`passage_not_found:${passageId}`);
    this.name = 'PassageNotFoundError';
  }
}

export interface SynthesizeOptions {
  /**
   * true면 디스크 캐시를 우회하여 Supertonic을 다시 호출하고 오디오를 덮어쓴다.
   * 사용처: reader의 다시듣기/자동복구 — 깨진 오디오가 캐시되어 있을 때
   * 사용자가 "다시 만들어 달라"고 명시한 경로. 멱등 캐시(force=false)와는
   * 분리해 비싼 Supertonic 호출이 자동 재시도로 폭주하지 않도록 한다.
   */
  force?: boolean;
}

export function synthesizePassage(
  passageId: number,
  opts: SynthesizeOptions = {},
): Promise<PersistedAudio> {
  // force=true는 inFlight 병합을 우회. 같은 passage에 대한 cached read와
  // forced regenerate가 같은 promise를 공유하면 forced 경로가 cached 결과를
  // 받게 되어 "다시 만들기"가 silently 무동작이 된다.
  // 동시 force 호출은 마지막 writeFile이 이기는 형태로 안전.
  if (!opts.force) {
    const existing = inFlight.get(passageId);
    if (existing) return existing;
  }

  const promise = (async (): Promise<PersistedAudio> => {
    // 합성에는 textEn, 캐시 보정에는 audioPath만 필요 — 전체 행 대신 두 컬럼만.
    const [passage] = await db
      .select({
        textEn: schema.passages.textEn,
        audioPath: schema.passages.audioPath,
      })
      .from(schema.passages)
      .where(eq(schema.passages.id, passageId))
      .limit(1);
    if (!passage) throw new PassageNotFoundError(passageId);

    const { abs, webPath } = audioFileFor(passageId);
    // 디스크의 wav 파일이 정답. DB가 비어 있어도(이전 합성에서 writeFile 후
    // updatePassageAudio가 누락·실패했던 경우) 파일이 있으면 재합성하지 않고
    // DB만 보정한다. — Supertonic 불필요 호출 방지(MVP에서 가장 비싼 경로).
    // force=true이면 이 단축 경로를 건너뛰어 무조건 재합성한다.
    if (!opts.force && (await fileExists(abs))) {
      if (passage.audioPath !== webPath) {
        await updatePassageAudio(passageId, webPath);
      }
      return { audioPath: webPath, cached: true };
    }

    const wav = await synthesize({ text: passage.textEn });
    await mkdir(path.dirname(abs), { recursive: true });
    await writeFile(abs, wav);
    await updatePassageAudio(passageId, webPath);
    return { audioPath: webPath, cached: false, bytes: wav.byteLength };
  })();

  // 멱등 호출만 inFlight에 등록. force는 위에서 우회.
  if (!opts.force) {
    inFlight.set(passageId, promise);
    // 성공/실패와 무관하게 맵에서 제거해 다음 호출이 재시도 가능하게 한다.
    promise.finally(() => inFlight.delete(passageId)).catch(() => void 0);
  }
  return promise;
}
