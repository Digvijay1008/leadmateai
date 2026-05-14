import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
    try {
        const docRes = await pool.query(`SELECT id, error_message FROM kb_documents WHERE status = 'error'`);
        console.log(JSON.stringify(docRes.rows, null, 2));
    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}
run();
