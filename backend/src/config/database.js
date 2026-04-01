import pg from 'pg';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('error', (err) => console.error('PG pool error', err));

export const query = (text, params) => pool.query(text, params);

export async function runMigrations() {
  try {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    const sqlPath = join(__dirname, '../../../docker/init.sql');
    const sql = readFileSync(sqlPath, 'utf8');
    await pool.query(sql);
    console.log('✅ Database migrations completed');
  } catch (err) {
    console.error('❌ Migration error:', err.message);
  }
}

export default pool;