import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function debugWallet() {
    try {
        const wallets = await pool.query("SELECT * FROM wallets");
        console.log('--- WALLETS ---');
        console.table(wallets.rows);
        
        const holds = await pool.query("SELECT * FROM wallet_holds WHERE status = 'active'");
        console.log('--- ACTIVE HOLDS ---');
        console.table(holds.rows);
        
        // Calculate available balance for each wallet
        for (const wallet of wallets.rows) {
            const tenantId = wallet.tenant_id;
            const holdsTotalResult = await pool.query("SELECT COALESCE(SUM(amount), 0) as total FROM wallet_holds WHERE wallet_id = $1 AND status = 'active'", [tenantId]);
            const holdsTotal = parseFloat(holdsTotalResult.rows[0].total);
            const balance = parseFloat(wallet.balance);
            console.log(`Tenant ${tenantId}: Balance=${balance}, Holds=${holdsTotal}, Available=${balance - holdsTotal}`);
        }
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await pool.end();
    }
}

debugWallet();
