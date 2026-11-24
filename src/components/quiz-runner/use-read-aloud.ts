'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api-client';
import { PAUSE_BETWEEN_ITEMS_MS, type ReadAloudItem } from '@/lib/quiz/read-aloud';

/** 같은 오디오 요소를 재사용해 새 문장을 처음부터 — 리더와 같은 실효 속도(합성 0.85 × 재생 1.06 ≈ 0.9배). */
function loadClip(el: HTMLAudioElement, src: string) {
  el.src = src;
  el.currentTime = 0;
  el.playbackRate = 1.06;
}

/**
 * 퀴즈 읽어 주기 재생(15차) — 한 번에 하나만. 새 재생이 이전 재생(차례 읽기 포함)을 멈춘다.
 * 재생은 리더 문장 탭과 같은 `/api/tts/word`(텍스트 해시 캐시) + 같은 재생 속도(1.06).
 * 실패는 리더와 같은 토스트, 사용자가 멈춘 것(취소)은 조용히 끝낸다.
 */
export function useQuizReadAloud() {
  /** 지금 읽는 항목(없으면 null) — 선택지 카드 강조·버튼 표시에 쓴다. */
  const [current, setCurrent] = useState<ReadAloudItem | null>(null);
  /** 말풍선 🔊의 차례 읽기가 진행 중인지 — 버튼이 "멈추기"로 바뀐다. */
  const [isSequence, setIsSequence] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const cacheRef = useRef(new Map<string, string>());
  /** 재생 세대 — 멈춘 뒤 늦게 끝난 이전 재생이 새 재생의 상태를 지우지 않게. */
  const generationRef = useRef(0);
  /** 재생 중인 문장의 완료 대기(멈추면 false로 풀어 준다). */
  const pendingRef = useRef<((finished: boolean) => void) | null>(null);
  const pauseTimerRef = useRef<number | null>(null);

  const stop = useCallback(() => {
    generationRef.current += 1;
    const el = audioRef.current;
    if (el) {
      el.onended = null;
      el.onerror = null;
      el.pause();
    }
    if (pauseTimerRef.current !== null) {
      window.clearTimeout(pauseTimerRef.current);
      pauseTimerRef.current = null;
    }
    pendingRef.current?.(false);
    pendingRef.current = null;
    setCurrent(null);
    setIsSequence(false);
  }, []);

  /** 한 문장을 끝까지 재생하면 true, 도중에 멈추면 false. 합성·재생 실패는 throw. */
  const playToEnd = useCallback(async (text: string, generation: number): Promise<boolean> => {
    let src = cacheRef.current.get(text);
    if (!src) {
      const res = await apiFetch<{ audioPath: string }>('/api/tts/word', {
        method: 'POST',
        body: JSON.stringify({ text }),
      });
      src = res.audioPath;
      cacheRef.current.set(text, src);
    }
    if (generation !== generationRef.current) return false;
    const el = audioRef.current ?? new Audio();
    audioRef.current = el;
    loadClip(el, src);
    // play()가 재생 시작으로 풀린 뒤에 끝/실패를 기다린다(재생 전 실패는 play()가 throw).
    await el.play();
    if (generation !== generationRef.current) return false;
    const finished = await new Promise<boolean>((resolve, reject) => {
      pendingRef.current = resolve;
      el.onended = () => resolve(true);
      el.onerror = () => reject(new Error('오디오를 재생하지 못했어요'));
    });
    pendingRef.current = null;
    return finished;
  }, []);

  const run = useCallback(
    async (items: Array<[ReadAloudItem, string]>, sequence: boolean) => {
      stop();
      if (items.length === 0) return;
      const generation = generationRef.current;
      setIsSequence(sequence);
      try {
        for (let i = 0; i < items.length; i += 1) {
          if (generation !== generationRef.current) return;
          const [item, text] = items[i];
          setCurrent(item);
          const finished = await playToEnd(text, generation);
          if (!finished || generation !== generationRef.current) return;
          if (i < items.length - 1) {
            await new Promise<void>((resolve) => {
              pauseTimerRef.current = window.setTimeout(() => {
                pauseTimerRef.current = null;
                resolve();
              }, PAUSE_BETWEEN_ITEMS_MS);
            });
          }
        }
      } catch (err) {
        // 멈춘 뒤 도착한 실패(요청 중단 등)는 사용자가 의도한 흐름 — 알리지 않는다.
        if (generation !== generationRef.current) return;
        console.error('[quiz:tts] read_aloud_fail err=', err);
        toast.error(`읽어 주기 실패: ${(err as Error).message}`);
      } finally {
        if (generation === generationRef.current) {
          setCurrent(null);
          setIsSequence(false);
        }
      }
    },
    [playToEnd, stop],
  );

  /** 말풍선 🔊: 차례 읽기 중이면 멈추고, 아니면 차례 읽기를 시작한다. */
  const toggleSequence = useCallback(
    (items: Array<[ReadAloudItem, string]>) => {
      if (isSequence) stop();
      else void run(items, true);
    },
    [isSequence, run, stop],
  );

  /** 선택지·근거 🔊: 그 항목 하나만 읽는다. */
  const speak = useCallback(
    (item: ReadAloudItem, text: string) => {
      void run([[item, text]], false);
    },
    [run],
  );

  // 화면 이탈 시 정지.
  useEffect(() => stop, [stop]);

  return { current, isSequence, toggleSequence, speak, stop };
}
