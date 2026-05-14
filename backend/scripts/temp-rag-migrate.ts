import pg from 'pg';
import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
    try {
        const sql = fs.readFileSync('src/db/migrations/005_rag_pipeline.sql', 'utf8');
        await pool.query(sql);
        console.log('✅ Migration ran — system_prompt + greeting_message columns exist');

        const colRes = await pool.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'tenants' AND column_name IN ('system_prompt', 'greeting_message')`);
        console.log('Columns:', colRes.rows.map(r => r.column_name).join(', '));

        const idxRes = await pool.query(`SELECT indexname FROM pg_indexes WHERE tablename = 'kb_embeddings'`);
        console.log('Indexes:', idxRes.rows.map(r => r.indexname).join(', '));

        await pool.query(`
            UPDATE tenants 
            SET 
              system_prompt = 'You are the AI receptionist for Sharma Dental Clinic. You are polite, professional, and helpful. Answer questions about dental services, appointments, and clinic timings. Always confirm patient details before booking.',
              greeting_message = 'Namaste! Sharma Dental Clinic mein aapka swagat hai. Main aapki kaise madad kar sakta hoon?'
            WHERE id = '32f67511-cc64-4856-bceb-86f21797e206'
        `);
        console.log('✅ Agent config seeded');
    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}
run();
