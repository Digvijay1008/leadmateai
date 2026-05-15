import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function checkSpecificTrunk() {
    try {
        const res = await pool.query("SELECT id, name, livekit_trunk_id FROM tenant_sip_trunks WHERE livekit_trunk_id = 'ST_mRR6oNwwQVJF'");
        console.log('Match for ST_mRR6oNwwQVJF:', res.rows);
        
        const all = await pool.query("SELECT name, livekit_trunk_id FROM tenant_sip_trunks");
        console.log('All Trunks in DB:', all.rows);
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await pool.end();
    }
}

checkSpecificTrunk();
