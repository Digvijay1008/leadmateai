import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function checkHolds() {
    try {
        const holds = await pool.query("SELECT * FROM wallet_holds WHERE status = 'active'");
        console.log('Active Holds:', holds.rows);
        
        const wallet = await pool.query("SELECT * FROM wallets");
        console.log('Wallets:', wallet.rows);
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await pool.end();
    }
}

checkHolds();
