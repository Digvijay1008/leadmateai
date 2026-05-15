import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function cleanupTrunks() {
    const tenantId = '425624ad-1b83-4f9c-adf5-0e03c886829c';
    const keepTrunkId = 'b04ad144-b7a0-426c-910b-fb15a6419a78'; // This is ST_mtrrL2Lcjfdf

    try {
        console.log(`Starting cleanup for tenant ${tenantId}...`);
        
        // 1. Unlink any phone numbers from trunks we are about to delete
        // (Just in case, though my check showed only the 'keep' one is linked)
        const unlinkRes = await pool.query(
            `UPDATE phone_numbers 
             SET sip_trunk_id = NULL 
             WHERE tenant_id = $1 AND sip_trunk_id != $2`,
            [tenantId, keepTrunkId]
        );
        console.log(`Unlinked ${unlinkRes.rowCount} phone numbers from old trunks.`);

        // 2. Delete the old trunks
        const deleteRes = await pool.query(
            `DELETE FROM tenant_sip_trunks 
             WHERE tenant_id = $1 AND id != $2`,
            [tenantId, keepTrunkId]
        );
        console.log(`Deleted ${deleteRes.rowCount} old SIP trunks.`);

        // 3. Ensure the remaining trunk is active
        await pool.query(
            `UPDATE tenant_sip_trunks SET is_active = true WHERE id = $1`,
            [keepTrunkId]
        );
        
        console.log('Cleanup successful! Kept trunk: ST_mtrrL2Lcjfdf');

    } catch (err) {
        console.error('Cleanup failed:', err);
    } finally {
        await pool.end();
    }
}

cleanupTrunks();
