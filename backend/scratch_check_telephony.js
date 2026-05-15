import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function checkTelephony() {
    try {
        const trunks = await pool.query('SELECT * FROM tenant_sip_trunks');
        console.log('--- SIP TRUNKS ---');
        console.table(trunks.rows);
        
        const phones = await pool.query('SELECT * FROM phone_numbers');
        console.log('--- PHONE NUMBERS ---');
        console.table(phones.rows);
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await pool.end();
    }
}

checkTelephony();
