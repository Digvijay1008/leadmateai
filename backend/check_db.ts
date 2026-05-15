import { Client } from 'pg';
import * as dotenv from 'dotenv';
dotenv.config();

async function check() {
    const client = new Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();
    try {
        const res1 = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name LIKE '%phone_numbers%';
        `);
        console.log("TABLES:", res1.rows);

        const res2 = await client.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'tenant_phone_numbers';
        `);
        console.log("tenant_phone_numbers COLUMNS:", res2.rows.map(r => r.column_name));
        
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
check();
