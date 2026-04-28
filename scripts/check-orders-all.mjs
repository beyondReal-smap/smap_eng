import { createConnection } from 'mysql2/promise';
const conn = await createConnection(process.env.DATABASE_URL);
const [rows] = await conn.execute(
  'SELECT id, user_id, package_id, amount, stars, toss_order_id, status, created_at, confirmed_at FROM orders ORDER BY created_at DESC LIMIT 20'
);
console.log(JSON.stringify(rows, null, 2));
const [users] = await conn.execute(
  "SELECT id, email FROM users WHERE email = 'hwgiai.team@gmail.com' LIMIT 1"
);
console.log('user:', JSON.stringify(users, null, 2));
await conn.end();
