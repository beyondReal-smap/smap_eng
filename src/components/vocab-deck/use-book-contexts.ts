'use client';

import { useCallback, useRef, useState } from 'react';
import { apiFetch } from '@/lib/api-client';
import type { Book, Passage } from '@/lib/db/schema';

export interface VocabBookContext {
  book: Book;
  passages: Passage[];
}

/**
 * 단어가 나온 책의 맥락(책 + passages)을 기존 `GET /api/books/{id}`로 **책별 1회** 받아 캐시한다.
 * 진행 중이거나 실패한 책은 다시 요청하지 않는다 — 실패는 로그만 남기고 카드 동작(뒤집기·채점)은 막지 않는다
 * (앞면은 자리표시 그라데이션, 뒷면은 문장 줄 생략).
 */
export function useBookContexts() {
  const [contexts, setContexts] = useState<Record<number, VocabBookContext>>({});
  const requestedRef = useRef(new Set<number>());

  const prefetch = useCallback((bookIds: number[]) => {
    for (const id of new Set(bookIds)) {
      if (requestedRef.current.has(id)) continue;
      requestedRef.current.add(id);
      apiFetch<{ book: Book; passages: Passage[] }>(`/api/books/${id}`)
        .then((res) => {
          setContexts((prev) => ({ ...prev, [id]: { book: res.book, passages: res.passages } }));
        })
        .catch((err: unknown) => {
          console.warn(`[vocab] book context load failed (book ${id}) — card shows placeholder:`, err);
        });
    }
  }, []);

  return { contexts, prefetch };
}
