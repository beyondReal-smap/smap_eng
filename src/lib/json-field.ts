/**
 * mysql2 드라이버는 JSON 컬럼을 BLOB 타입으로 분류해 string으로 반환한다.
 * `src/lib/db/index.ts`의 typeCast가 alternate_ending / vocabulary / choices를
 * 화이트리스트로 처리하지만, 빌드/캐시/외부 도입 데이터 등으로 우회되는 경로가
 * 있어(2026-04-26 사고) 컴포넌트 단에서 한 번 더 정규화한다.
 *
 * 이미 object/array면 그대로 통과, string이면 JSON.parse, 실패 시 null 반환.
 */
export function parseJsonField<T>(value: unknown): T | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string') {
    if (value.length === 0) return null;
    try {
      return JSON.parse(value) as T;
    } catch {
      return null;
    }
  }
  return value as T;
}
