import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function checkTenantVoiceConfig() {
    try {
        const configs = await pool.query('SELECT * FROM tenant_voice_config');
        console.log('Tenant Voice Configs:', configs.rows);
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await pool.end();
    }
}

checkTenantVoiceConfig();
