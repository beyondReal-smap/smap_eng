'use client';

/**
 * 아주 단순한 Leitner 스타일 SRS(Spaced Repetition System).
 * localStorage 전용 — 서버 저장 없음. 프로필별 네임스페이스 분리.
 *
 * 평가는 **2단계만**: "몰라"(again) / "알아"(good)
 *  - 새 단어: level=0, due=now (즉시 학습 대상)
 *  - "몰라"(again): level=0, due=+5분 — "모르는 단어" 탭에서 다시 보임
 *  - "알아"(good): level+1, 레벨별 간격만큼 뒤로 밀림
 *
 * 최대 레벨은 3(7일 주기). 이후도 7일 고정.
 */

const INTERVAL_MS = [
  5 * 60 * 1000,
  24 * 60 * 60 * 1000,
  3 * 24 * 60 * 60 * 1000,
  7 * 24 * 60 * 60 * 1000,
];
const MAX_LEVEL = 3;

export type Grade = 'again' | 'good';

export interface SrsItem {
  level: number;
  /** epoch ms */
  dueAt: number;
  /** epoch ms */
  lastGradedAt: number;
}

export type SrsStore = Record<string, SrsItem>;

function storageKey(profileId: number): string {
  return `srs:${profileId}`;
}

/** 단어 키 정규화 — 대소문자·양끝 공백·구두점 무시. */
export function normalizeKey(word: string): string {
  return word.trim().toLowerCase().replace(/[.,!?;:"']/g, '');
}

export function loadStore(profileId: number): SrsStore {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(storageKey(profileId));
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') return {};
    return parsed as SrsStore;
  } catch {
    return {};
  }
}

export function saveStore(profileId: number, store: SrsStore): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(storageKey(profileId), JSON.stringify(store));
  } catch {
    /* ignore */
  }
}

/** 단어에 점수를 매기고 다음 간격을 계산해 저장. */
export function gradeWord(
  profileId: number,
  word: string,
  grade: Grade,
): SrsItem {
  const store = loadStore(profileId);
  const key = normalizeKey(word);
  const prev = store[key] ?? { level: 0, dueAt: 0, lastGradedAt: 0 };
  const now = Date.now();

  const level =
    grade === 'again' ? 0 : Math.min(MAX_LEVEL, prev.level + 1);
  const interval = INTERVAL_MS[level] ?? INTERVAL_MS[MAX_LEVEL];
  const next: SrsItem = {
    level,
    dueAt: now + interval,
    lastGradedAt: now,
  };
  store[key] = next;
  saveStore(profileId, store);
  return next;
}

/**
 * "모르는 단어"인지 판정 — 평가 이력이 있고(lastGradedAt>0), 현재 레벨이 0인 단어.
 * 아직 평가 안 한 새 단어와 구분하기 위해 lastGradedAt 조건 필수.
 */
export function isUnknown(store: SrsStore, word: string): boolean {
  const item = getItem(store, word);
  if (!item) return false;
  return item.level === 0 && item.lastGradedAt > 0;
}

/** 키 기준 현재 상태 조회. 없으면 null. */
export function getItem(
  store: SrsStore,
  word: string,
): SrsItem | null {
  return store[normalizeKey(word)] ?? null;
}

/** 현재 시점에서 복습 대상인가 — 새 단어(저장된 기록 없음) 또는 dueAt <= now. */
export function isDue(store: SrsStore, word: string, now = Date.now()): boolean {
  const item = getItem(store, word);
  if (!item) return true;
  return item.dueAt <= now;
}
