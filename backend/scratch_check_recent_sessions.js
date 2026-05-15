import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function checkRecentSessions() {
    try {
        const res = await pool.query('SELECT tenant_id, created_at, status FROM voice_sessions ORDER BY created_at DESC LIMIT 5');
        console.log('Recent Sessions:', res.rows);
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await pool.end();
    }
}

checkRecentSessions();
