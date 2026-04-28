import { createConnection } from 'mysql2/promise';
import { createHash, randomBytes } from 'node:crypto';

const userId = process.argv[2];
if (!userId) { console.error('usage: node scripts/inject-bearer-token.mjs <userId>'); process.exit(1); }

const raw = randomBytes(32).toString('base64url');
const hash = createHash('sha256').update(raw).digest('hex');
const expires = new Date(Date.now() + 1000 * 60 * 60 * 24);

const conn = await createConnection(process.env.DATABASE_URL);
await conn.execute(
  'INSERT INTO mobile_auth_tokens (user_id, token_hash, kind, expires_at) VALUES (?, ?, ?, ?)',
  [userId, hash, 'access_token', expires],
);
await conn.end();
console.log(JSON.stringify({ token: raw, userId, expires: expires.toISOString() }));
