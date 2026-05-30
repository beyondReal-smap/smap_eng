// queries 도메인 간 공유 헬퍼 — mysql2 JSON 컬럼 정규화 + 날짜 포맷.

export function parseJsonColumn<T>(
  fieldName: string,
  value: T | string | null,
): T | null {
  if (value === null) return null;
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value) as T;
  } catch (cause) {
    throw new Error(`Invalid JSON in ${fieldName}`, { cause });
  }
}

export function toYMD(d: Date): string {
  return d.toISOString().slice(0, 10);
}
