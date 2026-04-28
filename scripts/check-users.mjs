import { createConnection } from 'mysql2/promise';
const conn = await createConnection(process.env.DATABASE_URL);
const [users] = await conn.execute(
  'SELECT id, email, role FROM users ORDER BY id DESC LIMIT 10'
);
console.log('users:', JSON.stringify(users, null, 2));
const [sessions] = await conn.execute(
  'SELECT sessionToken, userId, expires FROM sessions ORDER BY expires DESC LIMIT 5'
);
console.log('sessions:', JSON.stringify(sessions, null, 2));
await conn.end();
