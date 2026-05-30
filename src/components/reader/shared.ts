// Reader 컴포넌트군 공유 상수·타입·순수 헬퍼.
// 본체(reader.tsx)와 보조 컴포넌트/훅이 공유한다. React 의존 없음.

import type { CefrLevel, VocabularyEntry } from '@/lib/db/schema';

export interface TtsResponse {
  passageId: number;
  audioPath: string;
  cached: boolean;
}

export type SlideDir = 'next' | 'prev' | null;

export type Branch = 'A' | 'B';

export type FontSize = 'sm' | 'md' | 'lg';

export const LEVEL_CLASS: Record<CefrLevel, string> = {
  A1: 'level-a1',
  A2: 'level-a2',
  B1: 'level-b1',
  B2: 'level-b2',
};

export const progressKey = (bookId: number) => `reader:progress:${bookId}`;
export const autoplayKey = (bookId: number) => `reader:autoplay:${bookId}`;
export const branchKey = (bookId: number) => `reader:branch:${bookId}`;
export const logKey = (profileId: number, bookId: number) =>
  `reader:log:${profileId}:${bookId}`;
export const fontSizeKey = 'reader:font-size';

// 백그라운드 prefetch는 직렬(while + await)이지만 GAP이 너무 짧으면 Kokoro
// PyTorch 모델의 메모리가 GC되기 전에 다음 합성이 시작되며 누적 spike가
// 발생해 PM2 max_memory_restart가 30초 주기로 트리거됐다(2026-04-26 사례).
// 1.5초 gap으로 매 합성 사이에 GC + soundfile buffer 해제 시간을 확보한다.
export const BACKGROUND_TTS_GAP_MS = 1500;
export const BACKGROUND_TTS_RETRY_MS = 10_000;

/** Reader 본문 영단어 문장의 타이포 클래스 — 3단계. */
export const PASSAGE_FONT_CLASS: Record<FontSize, string> = {
  sm: 'text-xl leading-relaxed sm:text-[24px] sm:leading-[1.5]',
  md: 'text-2xl leading-relaxed sm:text-[30px] sm:leading-[1.4]',
  lg: 'text-3xl leading-relaxed sm:text-[38px] sm:leading-[1.35]',
};

export function isFontSize(v: unknown): v is FontSize {
  return v === 'sm' || v === 'md' || v === 'lg';
}

export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// 어휘 단어를 본문과 매칭하기 위한 정규화 키.
// 단순 lowercase — 복수형/시제 변화는 MVP 범위 밖.
// null/undefined 방어 — LLM 응답 vocabulary 누락 항목, 또는 split/capture group에서
// 나올 수 있는 undefined token을 안전하게 빈 문자열로 처리.
export const normalize = (w: string | null | undefined): string =>
  (w ?? '').trim().toLowerCase().replace(/[.,!?;:"']/g, '');

export function buildVocabMap(list: VocabularyEntry[] | null | undefined) {
  const map = new Map<string, VocabularyEntry>();
  if (!list) return map;
  for (const entry of list) {
    if (!entry?.word) continue;
    const key = normalize(entry.word);
    if (key && !map.has(key)) map.set(key, entry);
  }
  return map;
}

// 영문 본문을 단어·공백·구두점 토큰으로 분할.
// /(\w[\w'-]*)/ 는 "don't", "long-lost" 같은 복합 단어도 하나로 유지.
// 빈 문자열/undefined 입력과 split capture group의 undefined 결과를 모두 걸러낸다.
export function tokenize(text: string | null | undefined): string[] {
  if (!text) return [];
  return text
    .split(/(\w[\w'-]*)/g)
    .filter((t): t is string => typeof t === 'string' && t !== '');
}
