import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function checkDuplicateNumbers() {
    try {
        const tenantId = '425624ad-1b83-4f9c-adf5-0e03c886829c';
        const res = await pool.query('SELECT number, COUNT(*) FROM phone_numbers WHERE tenant_id = $1 GROUP BY number HAVING COUNT(*) > 1', [tenantId]);
        console.log('Duplicate Numbers:', res.rows);
        
        const all = await pool.query('SELECT id, number, sip_trunk_id FROM phone_numbers WHERE tenant_id = $1', [tenantId]);
        console.log('All Numbers for Tenant:', all.rows);
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await pool.end();
    }
}

checkDuplicateNumbers();
