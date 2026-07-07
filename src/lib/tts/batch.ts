// 책 단위 TTS 일괄 생성 — 동화 생성 직후 after()로 킥오프된다.
// Supertonic은 CPU 바운드(ONNX)라 동시성을 올려도 이득이 적어 동시성 1로 순차 처리.
// 한 passage가 실패해도 나머지는 계속 — Reader가 on-demand로 재시도할 수 있다.
import { getBookById, listPassagesByBook } from '@/lib/db/queries';
import { synthesizePassage } from './persist';
import { synthesizeBookEndings } from './ending';

// 프로세스 메모리 dedupe. 같은 bookId로 배치가 이미 돌고 있으면 재진입 차단.
// self-hosted Node.js 단일 프로세스 기준 — 수평 확장 시에는 Redis lock으로 교체.
const inFlightBooks = new Set<number>();

/**
 * 책의 모든 passage 낭독 오디오를 순차 생성하는 fire-and-forget 배치.
 * 이미 audioPath가 채워진 passage는 skip. 호출자는 await하지 않는다.
 */
export function startBookTtsBatch(bookId: number): void {
  if (inFlightBooks.has(bookId)) return;
  inFlightBooks.add(bookId);
  void runBatch(bookId);
}

async function runBatch(bookId: number): Promise<void> {
  try {
    const passages = await listPassagesByBook(bookId);
    for (const passage of passages) {
      if (passage.audioPath) continue;
      try {
        await synthesizePassage(passage.id);
      } catch (err) {
        // 한 문장 실패해도 나머지는 계속. Reader는 on-demand fallback이 있다.
        console.error(
          `[tts:batch] book=${bookId} passage=${passage.id} failed:`,
          err,
        );
      }
    }

    // 본문 합성이 끝났으면 결말 분기 passages도 사전 합성. 픽션 + alternateEnding이
    // 있는 경우에만 실행. endingAudioPathsA/B가 이미 채워져 있으면 synthesizeBranch
    // 내부에서 디스크 캐시로 멱등 동작한다.
    try {
      const book = await getBookById(bookId);
      if (book?.alternateEnding) {
        await synthesizeBookEndings(bookId, book.alternateEnding);
      }
    } catch (err) {
      console.error(`[tts:ending] book=${bookId} failed:`, err);
    }
  } catch (err) {
    console.error(`[tts:batch] book=${bookId} fatal:`, err);
  } finally {
    inFlightBooks.delete(bookId);
  }
}
