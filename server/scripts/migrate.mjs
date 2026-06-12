// One-off migration runner. Takes the name of a file in src/db/migrations as
// its only argument (see CLAUDE.md for the runbook). Reads the connection
// string from server/.env via dotenv; never prints it.
import 'dotenv/config';
import { readFileSync } from 'node:fs';
import pg from 'pg';

const file = process.argv[2];
if (!file) {
  console.error('Usage: node scripts/migrate.mjs <migration.sql>');
  process.exit(1);
}

const sql = readFileSync(new URL(`../src/db/migrations/${file}`, import.meta.url), 'utf8');
const connectionString =
  process.env.NEONDB_URL || process.env.DATABASE_URL || process.env.NEON_DSN;
if (!connectionString) {
  console.error('No connection string in env');
  process.exit(1);
}

const pool = new pg.Pool({ connectionString, ssl: { rejectUnauthorized: false } });
try {
  await pool.query(sql);
  const tables = await pool.query(
    "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY 1"
  );
  console.log('applied:', file);
  console.log('tables :', tables.rows.map((r) => r.table_name).join(', '));
} finally {
  await pool.end();
}
