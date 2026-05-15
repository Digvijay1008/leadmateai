import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function checkRemainingTrunk() {
    try {
        const res = await pool.query("SELECT id, name, livekit_trunk_id, livekit_inbound_trunk_id, livekit_dispatch_rule_id FROM tenant_sip_trunks WHERE id = 'b04ad144-b7a0-426c-910b-fb15a6419a78'");
        console.log('Remaining Trunk Details:', res.rows[0]);
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await pool.end();
    }
}

checkRemainingTrunk();
