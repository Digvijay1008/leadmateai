import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
    try {
        const t1 = await pool.query(`SELECT booking_id, appointment_date as date, patient_name, tenant_id FROM tenant_appointments LIMIT 1`);
        console.log("== APPOINTMENT ==");
        console.log(JSON.stringify(t1.rows, null, 2));

        const t2 = await pool.query(`SELECT lead_id, name, interest, tenant_id FROM tenant_leads LIMIT 1`);
        console.log("== LEAD ==");
        console.log(JSON.stringify(t2.rows, null, 2));

        const t3 = await pool.query(`SELECT * FROM session_tool_calls ORDER BY created_at DESC LIMIT 5`);
        console.log("== TOOL CALLS ==");
        console.log(JSON.stringify(t3.rows, null, 2));

    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}
run();
