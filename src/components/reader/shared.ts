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
/** 완료한 미션의 passageIndex 배열(JSON)을 저장 — progress/branch와 같은 로컬 패턴. */
export const missionKey = (bookId: number) => `reader:mission:${bookId}`;
export const logKey = (profileId: number, bookId: number) =>
  `reader:log:${profileId}:${bookId}`;
export const fontSizeKey = 'reader:font-size';

// 백그라운드 prefetch는 직렬(while + await)이지만 GAP이 너무 짧으면 TTS
// 모델의 메모리가 GC되기 전에 다음 합성이 시작되며 누적 spike가
// 발생해 PM2 max_memory_restart가 30초 주기로 트리거됐다(2026-04-26 사례).
// 1.5초 gap으로 매 합성 사이에 GC + soundfile buffer 해제 시간을 확보한다.
export const BACKGROUND_TTS_GAP_MS = 1500;
export const BACKGROUND_TTS_RETRY_MS = 10_000;

/**
 * Reader 본문 영단어 문장의 타이포 클래스 — 3단계. 글꼴은 어린이 읽기용 Andika(font-reading),
 * 행간 1.55(그림책 리더, 네이티브 기본 27pt와 같은 기준).
 */
export const PASSAGE_FONT_CLASS: Record<FontSize, string> = {
  sm: 'font-reading text-[20px] leading-[1.55] sm:text-[23px]',
  md: 'font-reading text-[23px] leading-[1.55] sm:text-[27px]',
  lg: 'font-reading text-[27px] leading-[1.5] sm:text-[33px]',
};

/** 삽화 없는 쪽 — 종이 전체를 쓰므로 3px 크게(네이티브 27 → 30과 같은 규칙). */
export const PASSAGE_FONT_CLASS_PLAIN: Record<FontSize, string> = {
  sm: 'font-reading text-[23px] leading-[1.55] sm:text-[26px]',
  md: 'font-reading text-[26px] leading-[1.55] sm:text-[30px]',
  lg: 'font-reading text-[30px] leading-[1.5] sm:text-[36px]',
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

// 문장 종결로 오인하기 쉬운 약어 — 마침표가 문장 끝이 아니라 축약 표기인 경우.
// 본문 400건 표본에서 실제 출현은 2건(0.5%)이지만, 오분리되면 "Mr." 한 조각이
// 통째로 재생되어 눈에 띄게 어색해지므로 방어한다.
const SENTENCE_ABBREV =
  /\b(?:Mr|Mrs|Ms|Dr|St|Jr|Sr|Prof|vs|Fig|No|e\.g|i\.e)\.$/i;

/**
 * 영문 본문을 문장 단위로 분할한다. 문장 탭 재생(문장 하나만 듣기)의 단위.
 *
 * 반환 조각은 원문의 연속 구간이라 join('')하면 원문이 그대로 복원된다
 * (뒤따르는 공백·줄바꿈까지 각 조각이 보유). 본문을 조각으로 나눠 렌더해도
 * 화면상 텍스트가 달라지지 않아야 하므로 이 성질이 중요하다.
 * — 실제 passage 400건/문장 884개로 복원 일치를 검증했다.
 */
export function splitSentences(text: string | null | undefined): string[] {
  if (!text) return [];
  const out: string[] = [];
  let start = 0;
  // 종결부호 + 닫는 따옴표/괄호 + 뒤따르는 공백까지를 한 조각의 끝으로 본다.
  // ("Run!" 처럼 인용부호가 종결부호 뒤에 오는 대사체를 끊지 않기 위함)
  const re = /[.!?]+["'”’)\]]*\s+/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    // 종결부호 직전까지가 약어면 문장 경계가 아니므로 계속 이어붙인다.
    if (SENTENCE_ABBREV.test(text.slice(start, m.index + 1))) continue;
    const end = m.index + m[0].length;
    out.push(text.slice(start, end));
    start = end;
  }
  if (start < text.length) out.push(text.slice(start));
  return out.filter((s) => s.trim() !== '');
}
