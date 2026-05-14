import pg from 'pg';
import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
    try {
        const sql = fs.readFileSync('src/db/migrations/006_tool_tables.sql', 'utf8');
        await pool.query(sql);
        console.log('✅ Tool Migration ran');
    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}
run();
