import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function checkTelephony() {
    try {
        const trunks = await pool.query('SELECT id, tenant_id, name, sip_host, livekit_trunk_id FROM tenant_sip_trunks');
        console.log('--- SIP TRUNKS ---');
        trunks.rows.forEach(t => console.log(JSON.stringify(t)));
        
        const phones = await pool.query('SELECT id, tenant_id, number, sip_trunk_id FROM phone_numbers');
        console.log('--- PHONE NUMBERS ---');
        phones.rows.forEach(p => console.log(JSON.stringify(p)));
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await pool.end();
    }
}

checkTelephony();
