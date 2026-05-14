
import { query } from '../src/db/client.js';
import jwt from 'jsonwebtoken';
import { config as dotenvConfig } from 'dotenv';
import path from 'path';

dotenvConfig({ path: path.join(process.cwd(), '.env') });

const SECRET = process.env.JWT_SECRET || 'dev_secret';

async function main() {
    // 1. Find an active tenant
    const result = await query(
        `SELECT id, user_id FROM tenants WHERE status = 'active' LIMIT 1`
    );

    if (result.rows.length === 0) {
        console.error('No active tenant found.');
        process.exit(1);
    }

    const tenant = result.rows[0];
    console.log(`TEST_TENANT_ID=${tenant.id}`);

    // 2. Generate User Token
    const token = jwt.sign(
        {
            user_id: tenant.user_id,
            type: 'user'
        },
        SECRET,
        { expiresIn: '1d' }
    );

    console.log(`TEST_USER_TOKEN=${token}`);
    process.exit(0);
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
