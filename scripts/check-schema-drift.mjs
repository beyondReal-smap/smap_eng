import { createConnection } from 'mysql2/promise';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('DATABASE_URL 환경변수가 필요합니다.');
}

const EXPECTED_MIGRATION_AT = 1787055203659;

const expectedColumns = [
  ['profiles', 'deleted_at', 'timestamp', null],
  ['iap_transactions', 'platform', 'varchar', 16],
  ['iap_transactions', 'transaction_id', 'varchar', 255],
  ['iap_transactions', 'status', 'varchar', 16],
  ['push_tokens', 'device_token', 'varchar', 512],
  ['push_tokens', 'platform', 'varchar', 16],
  ['credit_transactions', 'iap_transaction_id', 'int', null],
];

const expectedTables = [
  'iap_transactions',
  'push_tokens',
  'push_send_logs',
  'vocab_progress',
  'vocab_grade_log',
];

const expectedIndexes = [
  ['iap_transactions', 'iap_tx_id_uniq', 0],
  ['iap_transactions', 'iap_tx_user_idx', 1],
  ['push_tokens', 'push_token_uniq', 0],
  ['push_tokens', 'push_token_user_idx', 1],
  ['push_tokens', 'push_token_platform_idx', 1],
  ['credit_transactions', 'credit_tx_iap_idx', 0],
];

const expectedForeignKeys = [
  ['credit_transactions', 'credit_tx_iap_fk', 'iap_transactions'],
];

const connection = await createConnection(databaseUrl);

try {
  await connection.query('START TRANSACTION READ ONLY');

  const [databaseRows] = await connection.query(
    'SELECT DATABASE() AS databaseName',
  );
  const databaseName = databaseRows[0]?.databaseName;
  if (typeof databaseName !== 'string' || databaseName.length === 0) {
    throw new Error('DATABASE_URL에서 대상 데이터베이스를 확인할 수 없습니다.');
  }

  const [tableRows] = await connection.execute(
    `SELECT TABLE_NAME
       FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = ?`,
    [databaseName],
  );
  const tables = new Set(tableRows.map((row) => row.TABLE_NAME));

  const [columnRows] = await connection.execute(
    `SELECT TABLE_NAME, COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH
       FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = ?`,
    [databaseName],
  );
  const columns = new Map(
    columnRows.map((row) => [
      `${row.TABLE_NAME}.${row.COLUMN_NAME}`,
      row,
    ]),
  );

  const [indexRows] = await connection.execute(
    `SELECT TABLE_NAME, INDEX_NAME, NON_UNIQUE
       FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = ?`,
    [databaseName],
  );
  const indexes = new Map(
    indexRows.map((row) => [
      `${row.TABLE_NAME}.${row.INDEX_NAME}`,
      row,
    ]),
  );

  const [foreignKeyRows] = await connection.execute(
    `SELECT TABLE_NAME, CONSTRAINT_NAME, REFERENCED_TABLE_NAME
       FROM information_schema.REFERENTIAL_CONSTRAINTS
      WHERE CONSTRAINT_SCHEMA = ?`,
    [databaseName],
  );
  const foreignKeys = new Map(
    foreignKeyRows.map((row) => [
      `${row.TABLE_NAME}.${row.CONSTRAINT_NAME}`,
      row,
    ]),
  );

  const issues = [];

  for (const table of expectedTables) {
    if (!tables.has(table)) {
      issues.push({ kind: 'missing_table', table });
    }
  }

  for (const [table, column, dataType, maxLength] of expectedColumns) {
    const actual = columns.get(`${table}.${column}`);
    if (!actual) {
      issues.push({ kind: 'missing_column', table, column });
      continue;
    }
    const actualLength =
      actual.CHARACTER_MAXIMUM_LENGTH === null
        ? null
        : Number(actual.CHARACTER_MAXIMUM_LENGTH);
    if (
      actual.DATA_TYPE.toLowerCase() !== dataType ||
      (maxLength !== null && actualLength !== maxLength)
    ) {
      issues.push({
        kind: 'column_mismatch',
        table,
        column,
        expected: { dataType, maxLength },
        actual: {
          dataType: actual.DATA_TYPE,
          maxLength: actualLength,
        },
      });
    }
  }

  for (const [table, index, nonUnique] of expectedIndexes) {
    const actual = indexes.get(`${table}.${index}`);
    if (!actual) {
      issues.push({ kind: 'missing_index', table, index });
      continue;
    }
    if (Number(actual.NON_UNIQUE) !== nonUnique) {
      issues.push({
        kind: 'index_uniqueness_mismatch',
        table,
        index,
        expectedNonUnique: nonUnique,
        actualNonUnique: Number(actual.NON_UNIQUE),
      });
    }
  }

  for (const [table, constraint, referencedTable] of expectedForeignKeys) {
    const actual = foreignKeys.get(`${table}.${constraint}`);
    if (!actual) {
      issues.push({ kind: 'missing_foreign_key', table, constraint });
      continue;
    }
    if (actual.REFERENCED_TABLE_NAME !== referencedTable) {
      issues.push({
        kind: 'foreign_key_target_mismatch',
        table,
        constraint,
        expectedReferencedTable: referencedTable,
        actualReferencedTable: actual.REFERENCED_TABLE_NAME,
      });
    }
  }

  let latestMigrationAt = null;
  if (tables.has('__drizzle_migrations')) {
    const [migrationRows] = await connection.query(
      'SELECT created_at FROM `__drizzle_migrations` ORDER BY created_at DESC LIMIT 1',
    );
    latestMigrationAt = migrationRows[0]?.created_at
      ? Number(migrationRows[0].created_at)
      : null;
  }
  if (latestMigrationAt !== EXPECTED_MIGRATION_AT) {
    issues.push({
      kind: 'migration_journal_mismatch',
      expectedLatestCreatedAt: EXPECTED_MIGRATION_AT,
      actualLatestCreatedAt: latestMigrationAt,
    });
  }

  const result = {
    ok: issues.length === 0,
    database: databaseName,
    checkedAt: new Date().toISOString(),
    latestMigrationAt,
    issues,
  };
  console.log(JSON.stringify(result, null, 2));
  if (!result.ok) process.exitCode = 1;
} finally {
  try {
    await connection.query('ROLLBACK');
  } finally {
    await connection.end();
  }
}
