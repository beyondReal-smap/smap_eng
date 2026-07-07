// DB 쿼리 공개 API.
//
// 구현은 도메인별로 `./queries/*` 에 분리돼 있고, 이 파일은 그것을 재export하는
// barrel이다. 호출부는 예전과 동일하게 `@/lib/db/queries` 한 경로만 import한다.
// (파일 `queries.ts` 와 디렉토리 `queries/` 는 공존 가능 — 모듈 해석상 충돌 없음)
//
// 내부 헬퍼(parseJsonColumn / toYMD / normalizeBook·QuizJsonFields)는 의도적으로
// 재export하지 않는다 — 공개 표면을 좁게 유지.

// credits.ts 등에서 `import { sql } from '@/lib/db/queries'` 형태로 사용.
export { sql } from 'drizzle-orm';

export * from './queries/profiles';
export * from './queries/books';
export * from './queries/vocab';
export * from './queries/passages';
export * from './queries/quizzes';
export * from './queries/reading-logs';
export * from './queries/parental';
export * from './queries/learning';
export * from './queries/admin';
