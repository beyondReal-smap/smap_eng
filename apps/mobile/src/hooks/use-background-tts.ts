import { useEffect, useRef } from 'react';

import { synthesizePassageAudio, type Passage } from '@/lib/api';

// Kokoro 메모리 spike 회피용 gap. 웹과 동일 값(2026-04-26 PM2 사고 대응).
const BACKGROUND_TTS_GAP_MS = 1500;
const BACKGROUND_TTS_RETRY_MS = 10_000;

type UpdateAudioPath = (passageId: number, audioPath: string) => void;

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Reader가 열려 있는 동안 audio_path가 비어 있는 passage를 직렬로 합성.
 *
 * 웹 reader.tsx와 동일한 정책:
 *  - 한 라운드에서 실패한 passage는 다음 라운드까지 재시도하지 않음
 *  - 모두 실패한 상태에서도 RETRY_MS 후 다시 라운드 시작
 *  - 화면 unmount 시 cancelled=true로 즉시 중단해 데이터 요금 보호
 *
 * `passages`가 변경되면(audioPath 채워짐) 컴포넌트 caller가 새 배열을 넘기고,
 * 이 훅의 effect가 재실행되며 missing 목록이 갱신된다.
 */
export function useBackgroundTts(
  bookId: number | null,
  passages: Passage[] | null,
  onAudioReady: UpdateAudioPath,
) {
  // onAudioReady를 의존성으로 두면 매 렌더마다 effect가 재실행되어 합성이
  // 초기화된다. ref로 최신값만 따라가게 하고 effect는 bookId/passages 신호로만 트리거.
  const onAudioReadyRef = useRef(onAudioReady);
  useEffect(() => {
    onAudioReadyRef.current = onAudioReady;
  }, [onAudioReady]);

  useEffect(() => {
    if (!bookId || !Array.isArray(passages) || passages.length === 0) return;
    const allReady = passages.every((p) => !!p.audioPath);
    if (allReady) return;

    let cancelled = false;
    const failedThisRound = new Set<number>();
    // passages는 caller state라 effect 시점의 스냅샷. 합성 중 다른 패시지가
    // 채워지면 caller가 setPassages → 새 배열 → effect 재실행으로 자연스럽게 갱신.
    const localCache = new Map<number, string>();
    for (const p of passages) {
      if (p.audioPath) localCache.set(p.id, p.audioPath);
    }

    async function runBackgroundTts() {
      while (!cancelled) {
        const next = (passages as Passage[]).find(
          (p) => !localCache.has(p.id) && !failedThisRound.has(p.id),
        );

        if (!next) {
          const stillMissing = (passages as Passage[]).some(
            (p) => !localCache.has(p.id),
          );
          if (!stillMissing) return;
          await wait(BACKGROUND_TTS_RETRY_MS);
          if (cancelled) return;
          failedThisRound.clear();
          continue;
        }

        try {
          const audioPath = await synthesizePassageAudio(next.id);
          if (cancelled) return;
          localCache.set(next.id, audioPath);
          failedThisRound.delete(next.id);
          onAudioReadyRef.current(next.id, audioPath);
        } catch (err) {
          failedThisRound.add(next.id);
          // 사용자 경험에 직접 영향 없음(on-demand 버튼이 fallback)이므로 warn으로.
          console.warn(
            `[tts:background] book=${bookId} passage=${next.id} failed`,
            err,
          );
        }

        await wait(BACKGROUND_TTS_GAP_MS);
      }
    }

    void runBackgroundTts();
    return () => {
      cancelled = true;
    };
  }, [bookId, passages]);
}
