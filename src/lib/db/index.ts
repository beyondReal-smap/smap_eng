import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from './schema';

// Next.js HMR로 인한 다중 pool 생성 방지(개발 환경).
declare global {
  var __smapEngPool: mysql.Pool | undefined;
}

function createPool(): mysql.Pool {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      'DATABASE_URL 환경변수가 설정되지 않았습니다. .env.local 확인 및 scripts/db-tunnel.sh 실행 여부를 확인하세요.',
    );
  }
  return mysql.createPool({
    uri: url,
    connectionLimit: 10,
    waitForConnections: true,
    // mysql2는 JSON 컬럼을 BLOB type으로 분류해 string으로 반환한다.
    // drizzle의 json() 컬럼 정의는 타입 힌트일 뿐 런타임 파싱을 보장하지 않아서,
    // 책의 alternate_ending / vocabulary 같은 JSON 필드가 클라이언트까지 string으로
    // 전달돼 `obj.labelA` 등이 모두 undefined가 되는 사고가 났다(2026-04-26).
    // text() 컬럼도 BLOB으로 인식되므로 type만으로는 구분 불가 → 컬럼명 화이트리스트.
    // schema에 새 json() 컬럼을 추가할 때 이 목록에 동기화해야 한다.
    typeCast: (field, next) => {
      const JSON_COLUMNS = new Set([
        'alternate_ending',
        'choices',
        'fun_facts',
        'intake',
        'vocabulary',
      ]);
      if (JSON_COLUMNS.has(field.name)) {
        const raw = field.string();
        if (raw === null) return null;
        try {
          return JSON.parse(raw);
        } catch {
          return raw;
        }
      }
      return next();
    },
  });
}

const pool = globalThis.__smapEngPool ?? createPool();

if (process.env.NODE_ENV !== 'production') {
  globalThis.__smapEngPool = pool;
}

export const db = drizzle(pool, { schema, mode: 'default' });
export { schema };
