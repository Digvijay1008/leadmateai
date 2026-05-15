import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function checkRecentActivity() {
    try {
        console.log('--- RECENT TRANSACTIONS ---');
        const txs = await pool.query('SELECT * FROM wallet_transactions ORDER BY created_at DESC LIMIT 10');
        console.table(txs.rows);
        
        console.log('--- RECENT SESSIONS ---');
        const sessions = await pool.query('SELECT id, tenant_id, status, created_at FROM voice_sessions ORDER BY created_at DESC LIMIT 10');
        console.table(sessions.rows);
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await pool.end();
    }
}

checkRecentActivity();
