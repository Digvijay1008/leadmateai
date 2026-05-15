import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function checkTrunkDetails() {
    try {
        const tenantId = '425624ad-1b83-4f9c-adf5-0e03c886829c';
        const res = await pool.query('SELECT * FROM tenant_sip_trunks WHERE tenant_id = $1 AND is_active = true', [tenantId]);
        console.log('Trunk Details:', res.rows);
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await pool.end();
    }
}

checkTrunkDetails();
