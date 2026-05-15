import { readFileSync } from 'fs';
import pkg from 'pg';
const { Pool } = pkg;

const env = readFileSync('.env', 'utf-8');
const dbUrl = env.match(/DATABASE_URL=(.+)/)?.[1]?.trim();

const pool = new Pool({
  connectionString: dbUrl,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
    const res = await pool.query('SELECT id, provider_name, livekit_trunk_id FROM tenant_sip_trunks');
    console.log("Trunks in Database:", res.rows);
  } catch (e) {
    console.error(e);
  } finally {
    pool.end();
  }
}
run();
