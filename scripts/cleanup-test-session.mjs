import { createConnection } from 'mysql2/promise';
const conn = await createConnection(process.env.DATABASE_URL);
const userId = process.argv[2];
if (!userId) { console.error('usage: node scripts/cleanup-test-session.mjs <userId>'); process.exit(1); }
await conn.beginTransaction();
const [o] = await conn.execute('DELETE FROM orders WHERE user_id = ?', [userId]);
const [t] = await conn.execute('DELETE FROM mobile_auth_tokens WHERE user_id = ?', [userId]);
const [s] = await conn.execute('DELETE FROM sessions WHERE userId = ?', [userId]);
const [u] = await conn.execute('DELETE FROM users WHERE id = ?', [userId]);
await conn.commit();
console.log(JSON.stringify({ orders: o.affectedRows, tokens: t.affectedRows, sessions: s.affectedRows, users: u.affectedRows }));
await conn.end();
