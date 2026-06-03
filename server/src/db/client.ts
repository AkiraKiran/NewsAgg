import { Pool } from 'pg'

// CLAUDE.md specifies NEONDB_URL; fall back to the other connection-string
// names already present in this project's .env so the server connects
// regardless of which one is populated.
const connectionString =
  process.env.NEONDB_URL || process.env.DATABASE_URL || process.env.NEON_DSN

const isLocal = connectionString?.includes('@db:') || connectionString?.includes('localhost') || connectionString?.includes('127.0.0.1')

export const pool = new Pool({
  connectionString,
  ssl: isLocal ? false : { rejectUnauthorized: false }
})

export async function query(text: string, params?: any[]) {
  const client = await pool.connect()
  try {
    return await client.query(text, params)
  } finally {
    client.release()
  }
}
