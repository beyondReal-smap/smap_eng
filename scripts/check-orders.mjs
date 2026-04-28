import { createConnection } from 'mysql2/promise';
const conn = await createConnection(process.env.DATABASE_URL);
const [rows] = await conn.execute('SELECT id, package_id, amount, stars, toss_order_id, status FROM orders WHERE user_id = ?', ['028be515ffbc1ba4aae3caa3']);
console.log(JSON.stringify(rows, null, 2));
await conn.end();
