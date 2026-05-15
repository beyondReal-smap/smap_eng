// 결말 분기(alternateEnding) passages의 사전 합성.
// 본문 passages는 DB 행이 있어 passage id 기반 합성/캐싱이 가능하지만, 결말 분기는
// books.alternate_ending JSON에 인라인 저장되므로 id가 없다. 대신 책 id + 분기 +
// orderIndex로 파일명을 구성해 안정적인 캐시 키로 사용한다.
//
// 파일 명명: /public/audio/ending-<bookId>-<A|B>-<idx>.wav
// 합성 실패한 슬롯은 '' (빈 문자열)로 보존 — Reader에서 falsy 체크로 음성 없음 처리.
import { mkdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { AlternateEnding } from '@/lib/db/schema';
import { updateBookEndingAudioPaths } from '@/lib/db/queries';
import { synthesize } from './kokoro';

const AUDIO_DIR = path.resolve(process.cwd(), 'public', 'audio');

function endingAudioFile(
  bookId: number,
  branch: 'A' | 'B',
  idx: number,
): { abs: string; webPath: string } {
  const filename = `ending-${bookId}-${branch}-${idx}.wav`;
  return { abs: path.join(AUDIO_DIR, filename), webPath: `/audio/${filename}` };
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
 * 단일 분기의 모든 passage를 순차 합성하고 결과 경로 배열을 books에 저장.
 * - 이미 디스크에 wav가 있으면 재합성하지 않음(멱등).
 * - 한 passage 실패해도 다른 passage는 계속. 실패 슬롯은 ''로 표시.
 */
async function synthesizeBranch(
  bookId: number,
  branch: 'A' | 'B',
  passages: { en: string }[],
): Promise<void> {
  await mkdir(AUDIO_DIR, { recursive: true });
  const paths: string[] = [];
  for (let i = 0; i < passages.length; i += 1) {
    const text = passages[i]?.en?.trim();
    if (!text) {
      paths.push('');
      continue;
    }
    const { abs, webPath } = endingAudioFile(bookId, branch, i);
    if (await fileExists(abs)) {
      paths.push(webPath);
      continue;
    }
    try {
      const wav = await synthesize({ text });
      await writeFile(abs, wav);
      paths.push(webPath);
    } catch (err) {
      console.error(
        `[tts:ending] book=${bookId} branch=${branch} idx=${i} failed:`,
        err,
      );
      paths.push('');
    }
  }
  await updateBookEndingAudioPaths(bookId, branch, paths);
}

/**
 * 책의 두 결말 분기 모두를 순차 합성. main passages 배치가 끝난 뒤 호출.
 * Reader가 사용자보다 먼저 도달할 일은 드물지만, 합성 중에는 endingAudioPaths*가
 * 잠시 비어 있을 수 있다 — Reader는 falsy 체크로 텍스트만 보여주고, 다음 진입 시
 * DB가 채워져 있다.
 */
export async function synthesizeBookEndings(
  bookId: number,
  endings: AlternateEnding,
): Promise<void> {
  if (Array.isArray(endings.passagesA) && endings.passagesA.length > 0) {
    await synthesizeBranch(bookId, 'A', endings.passagesA);
  }
  if (Array.isArray(endings.passagesB) && endings.passagesB.length > 0) {
    await synthesizeBranch(bookId, 'B', endings.passagesB);
  }
}
