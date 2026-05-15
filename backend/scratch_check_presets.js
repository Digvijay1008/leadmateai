import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function checkVoicePresets() {
    try {
        const presets = await pool.query('SELECT * FROM voice_presets');
        console.log('Voice Presets:', presets.rows);
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await pool.end();
    }
}

checkVoicePresets();
