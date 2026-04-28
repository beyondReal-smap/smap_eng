import { useCallback, useEffect, useRef, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

export type FontSize = 'sm' | 'md' | 'lg';

interface ReaderProgressState {
  savedIndex: number;
  savedAutoplay: boolean;
  savedFontSize: FontSize;
  hydrated: boolean;
}

const PROGRESS_KEY = (bookId: number) => `reader.progress.${bookId}`;
const AUTOPLAY_KEY = (bookId: number) => `reader.autoplay.${bookId}`;
const FONT_SIZE_KEY = 'reader.fontSize';

const DEFAULT_FONT_SIZE: FontSize = 'md';

function isFontSize(v: unknown): v is FontSize {
  return v === 'sm' || v === 'md' || v === 'lg';
}

async function readKey(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    if (typeof window === 'undefined') return null;
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  }
  try {
    return await SecureStore.getItemAsync(key);
  } catch {
    return null;
  }
}

async function writeKey(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(key, value);
    } catch {
      /* quota / private mode — 무시 */
    }
    return;
  }
  try {
    await SecureStore.setItemAsync(key, value);
  } catch {
    /* SecureStore 일시 실패 — 다음 변경 사이클에 재시도 */
  }
}

/**
 * Reader 진행 상태를 SecureStore(모바일) / localStorage(웹) 양쪽에 영속화.
 *
 * - savedIndex / savedAutoplay는 책별 키
 * - savedFontSize는 전역 키(웹과 모바일 모두 동일 정책)
 *
 * `hydrated`가 true가 되기 전엔 caller가 setActiveIndex 같은 후속 setter를
 * 호출하지 않도록 사용처에서 가드해야 한다. 책 길이 변경에 따른 클램프는
 * caller가 maxIdx를 알기 때문에 여기서 처리하지 않는다.
 */
export function useReaderProgress(bookId: number | null) {
  const [state, setState] = useState<ReaderProgressState>({
    savedIndex: 0,
    savedAutoplay: false,
    savedFontSize: DEFAULT_FONT_SIZE,
    hydrated: false,
  });
  // SecureStore 비동기 응답이 unmount 후 도착하면 setState가 leak — 가드용 ref.
  const cancelledRef = useRef(false);

  useEffect(() => {
    cancelledRef.current = false;
    if (!Number.isInteger(bookId) || (bookId ?? 0) <= 0) {
      setState({
        savedIndex: 0,
        savedAutoplay: false,
        savedFontSize: DEFAULT_FONT_SIZE,
        hydrated: true,
      });
      return;
    }
    const id = bookId as number;
    void (async () => {
      const [rawIdx, rawAutoplay, rawFont] = await Promise.all([
        readKey(PROGRESS_KEY(id)),
        readKey(AUTOPLAY_KEY(id)),
        readKey(FONT_SIZE_KEY),
      ]);
      if (cancelledRef.current) return;
      const parsedIdx = rawIdx !== null ? Number(rawIdx) : Number.NaN;
      const savedIndex = Number.isFinite(parsedIdx) && parsedIdx >= 0 ? parsedIdx : 0;
      const savedAutoplay = rawAutoplay === '1';
      const savedFontSize = isFontSize(rawFont) ? rawFont : DEFAULT_FONT_SIZE;
      setState({ savedIndex, savedAutoplay, savedFontSize, hydrated: true });
    })();
    return () => {
      cancelledRef.current = true;
    };
  }, [bookId]);

  const persistIndex = useCallback(
    (idx: number) => {
      if (!Number.isInteger(bookId) || (bookId ?? 0) <= 0) return;
      const id = bookId as number;
      void writeKey(PROGRESS_KEY(id), String(idx));
    },
    [bookId],
  );

  const persistAutoplay = useCallback(
    (autoplay: boolean) => {
      if (!Number.isInteger(bookId) || (bookId ?? 0) <= 0) return;
      const id = bookId as number;
      void writeKey(AUTOPLAY_KEY(id), autoplay ? '1' : '0');
    },
    [bookId],
  );

  const persistFontSize = useCallback((size: FontSize) => {
    void writeKey(FONT_SIZE_KEY, size);
  }, []);

  return {
    savedIndex: state.savedIndex,
    savedAutoplay: state.savedAutoplay,
    savedFontSize: state.savedFontSize,
    hydrated: state.hydrated,
    persistIndex,
    persistAutoplay,
    persistFontSize,
  };
}
