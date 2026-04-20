import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema';

const dbPath = process.env.DATABASE_PATH ?? './data.db';

// 개발 환경에서 Next.js HMR로 인한 다중 연결 방지
declare global {
  // eslint-disable-next-line no-var
  var __smapEngSqlite: Database.Database | undefined;
}

const sqlite = globalThis.__smapEngSqlite ?? new Database(dbPath);
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('foreign_keys = ON');

if (process.env.NODE_ENV !== 'production') {
  globalThis.__smapEngSqlite = sqlite;
}

export const db = drizzle(sqlite, { schema });
export { schema };
