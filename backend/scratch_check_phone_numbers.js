import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function checkPhoneNumbers() {
    try {
        const tenantId = '425624ad-1b83-4f9c-adf5-0e03c886829c';
        const res = await pool.query('SELECT * FROM phone_numbers WHERE tenant_id = $1', [tenantId]);
        console.log('Phone Numbers:', res.rows);
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await pool.end();
    }
}

checkPhoneNumbers();
