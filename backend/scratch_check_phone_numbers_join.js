import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function checkPhoneNumbersJoin() {
    try {
        const tenantId = '425624ad-1b83-4f9c-adf5-0e03c886829c';
        const query = `
             SELECT pn.id, pn.number, pn.is_active, pn.sip_trunk_id,
                    st.name as trunk_name, st.is_active as trunk_active
             FROM phone_numbers pn
             LEFT JOIN tenant_sip_trunks st ON st.id = pn.sip_trunk_id
             WHERE pn.tenant_id = $1
        `;
        const res = await pool.query(query, [tenantId]);
        console.log('Phone Numbers for Tenant:', res.rows);
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await pool.end();
    }
}

checkPhoneNumbersJoin();
