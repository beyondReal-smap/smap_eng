import { createConnection } from 'mysql2/promise';
const conn = await createConnection(process.env.DATABASE_URL);
const [sess] = await conn.execute('SELECT sessionToken, userId, expires FROM sessions WHERE sessionToken = ?', ['VSAnGvIZ7NA1s4c3J8BOjKaP2N8j0Jz-H5F3IJeqkJs']);
const [u] = await conn.execute('SELECT id, email FROM users WHERE id = ?', ['028be515ffbc1ba4aae3caa3']);
const [tables] = await conn.execute("SHOW TABLES LIKE '%order%'");
const [billing] = await conn.execute("SHOW TABLES LIKE '%credit%'");
console.log(JSON.stringify({ session: sess, user: u, orderTables: tables, creditTables: billing }, null, 2));
await conn.end();
