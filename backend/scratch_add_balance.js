import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function addBalanceToAll() {
    try {
        const result = await pool.query('UPDATE wallets SET balance = balance + 500');
        console.log(`Added 500 INR to ${result.rowCount} wallets.`);
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await pool.end();
    }
}

addBalanceToAll();
