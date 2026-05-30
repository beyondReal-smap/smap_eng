'use client';

import { useEffect, useState } from 'react';
import { fontSizeKey, isFontSize, type FontSize } from './shared';

/**
 * 본문 글자 크기 상태 + localStorage 복원/저장. 외부 페이지엔 영향 없는 Reader 전용 설정.
 * 반환: [현재 크기, setter] — useState와 동일 시그니처.
 */
export function useFontSize(): [FontSize, (v: FontSize) => void] {
  const [fontSize, setFontSize] = useState<FontSize>('md');

  // 글자 크기 복원 — 마운트 1회
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const saved = window.localStorage.getItem(fontSizeKey);
      if (isFontSize(saved)) setFontSize(saved);
    } catch {
      /* ignore */
    }
  }, []);

  // 변경 시 저장
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(fontSizeKey, fontSize);
    } catch {
      /* ignore */
    }
  }, [fontSize]);

  return [fontSize, setFontSize];
}
