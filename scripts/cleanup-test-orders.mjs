import { createConnection } from 'mysql2/promise';
const userId = process.argv[2];
if (!userId) {
  console.error('usage: node scripts/cleanup-test-orders.mjs <userId>');
  process.exit(1);
}
const conn = await createConnection(process.env.DATABASE_URL);
const [r1] = await conn.execute(
  "DELETE FROM mobile_auth_tokens WHERE user_id = ? AND kind = 'access_token'",
  [userId],
);
const [r2] = await conn.execute(
  "DELETE FROM orders WHERE user_id = ? AND status = 'pending'",
  [userId],
);
console.log(JSON.stringify({ tokensDeleted: r1.affectedRows, pendingOrdersDeleted: r2.affectedRows }));
await conn.end();
