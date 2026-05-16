'use client';

/**
 * Leitner 스타일 SRS(Spaced Repetition System).
 *
 * 저장소: localStorage(즉시 반응) + 서버(통계/디바이스 동기화). 평가 시 옵티미스틱하게 로컬을
 * 갱신하고, fire-and-forget으로 `POST /api/vocab/grade`에 동기. 부팅 시 `hydrateFromServer`로
 * 서버 진도를 받아 로컬과 머지(시각이 더 최신인 쪽으로).
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

/** 단어에 점수를 매기고 다음 간격을 계산해 저장. 서버 sync는 fire-and-forget. */
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

  // 서버 미러 — 실패해도 사용자 흐름 막지 않음(로컬은 이미 저장됨). 통계가 잠시 지연될 뿐.
  void fetch('/api/vocab/grade', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ profileId, word, grade }),
  }).catch(() => {
    /* offline / 일시 장애 — 다음 hydrate에서 일부 누락이 메워지지는 않지만 큰 문제 아님 */
  });

  return next;
}

/**
 * 서버 vocab_progress를 받아 로컬 store와 머지. 같은 키는 `lastGradedAt`이 더 큰 쪽 사용.
 * 부팅/로그인 직후 한 번 호출 — 다른 디바이스에서 평가한 진도가 통합된다.
 */
export async function hydrateFromServer(profileId: number): Promise<SrsStore> {
  try {
    const res = await fetch(`/api/vocab/progress?profileId=${profileId}`, {
      cache: 'no-store',
    });
    if (!res.ok) return loadStore(profileId);
    const data = (await res.json()) as {
      progress: Array<{
        wordKey: string;
        level: number;
        dueAtMs: number;
        lastGradedAtMs: number;
      }>;
    };
    const local = loadStore(profileId);
    for (const row of data.progress) {
      const cur = local[row.wordKey];
      if (!cur || row.lastGradedAtMs > cur.lastGradedAt) {
        local[row.wordKey] = {
          level: row.level,
          dueAt: row.dueAtMs,
          lastGradedAt: row.lastGradedAtMs,
        };
      }
    }
    saveStore(profileId, local);
    return local;
  } catch {
    return loadStore(profileId);
  }
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

/** 마스터(최대 레벨)했는가 — "전체"/"오늘 학습" 카운트에서 제외해 진행감을 표현. */
export function isMastered(store: SrsStore, word: string): boolean {
  const item = getItem(store, word);
  if (!item) return false;
  return item.level >= MAX_LEVEL;
}

/** 새 단어(평가 이력 없음)인지 — review deck에서 새 단어를 앞에 정렬할 때 사용. */
export function isNew(store: SrsStore, word: string): boolean {
  return getItem(store, word) === null;
}

export type CardState = 'new' | 'relearning' | 'learning' | 'mastered';

/** 카드 상태 분류 — UI 칩 표시용. */
export function cardState(store: SrsStore, word: string): CardState {
  const item = getItem(store, word);
  if (!item) return 'new';
  if (item.level >= MAX_LEVEL) return 'mastered';
  if (item.level === 0) return 'relearning';
  return 'learning';
}

/** 오늘(로컬 자정 이후) 평가한 단어 수 — 일일 목표 진행률 표시용. */
export function gradedTodayCount(store: SrsStore): number {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const startMs = start.getTime();
  return Object.values(store).filter((it) => it.lastGradedAt >= startMs).length;
}

/** 일일 학습 목표 — iOS와 동일한 20. */
export const DAILY_GOAL = 20;
