import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function checkTenantsAgentConfig() {
    try {
        const tenantId = '425624ad-1b83-4f9c-adf5-0e03c886829c';
        const res = await pool.query('SELECT llm_provider, llm_model, stt_provider, tts_provider FROM tenants WHERE id = $1', [tenantId]);
        console.log('Agent Config for Tenant (from tenants table):', res.rows[0]);
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await pool.end();
    }
}

checkTenantsAgentConfig();
