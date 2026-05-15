import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function checkTrunksOrdered() {
    try {
        const res = await pool.query("SELECT id, name, livekit_trunk_id, is_active, created_at FROM tenant_sip_trunks WHERE tenant_id = '425624ad-1b83-4f9c-adf5-0e03c886829c' ORDER BY created_at ASC");
        console.log('Trunks Ordered by Created At:');
        res.rows.forEach(r => console.log(JSON.stringify(r)));
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await pool.end();
    }
}

checkTrunksOrdered();
