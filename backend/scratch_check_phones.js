import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function checkPhoneNumbers() {
    try {
        const phones = await pool.query('SELECT * FROM tenant_phone_numbers');
        console.log('Tenant Phone Numbers:', phones.rows);
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await pool.end();
    }
}

checkPhoneNumbers();
