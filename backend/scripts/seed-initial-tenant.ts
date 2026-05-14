
import { query } from '../src/db/client.js';
import { v4 as uuidv4 } from 'uuid';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env') });

const SECRET = process.env.JWT_SECRET;
if (!SECRET) {
    console.error('❌ JWT_SECRET missing in .env');
    process.exit(1);
}

async function main() {
    console.log('🌱 Seeding Initial Tenant...');

    const client = await import('../src/db/client.js').then(m => m.pool.connect());

    try {
        await client.query('BEGIN');

        // 1. Create a User ID (mock Supabase Auth User)
        const userId = uuidv4();
        const tenantId = uuidv4();

        // 2. Create Tenant
        console.log(`   Creating Tenant: LeadMate Demo (${tenantId})`);
        await client.query(`
            INSERT INTO tenants (id, user_id, business_name, slug, status)
            VALUES ($1, $2, 'LeadMate Demo', 'leadmate-demo', 'active')
            ON CONFLICT (slug) DO NOTHING
        `, [tenantId, userId]);

        // check if inserted or existed
        const tenantRes = await client.query('SELECT id, user_id FROM tenants WHERE slug = $1', ['leadmate-demo']);
        const existingTenant = tenantRes.rows[0];

        // 3. Create Wallet (if not exists)
        console.log(`   Creating Wallet...`);
        await client.query(`
            INSERT INTO wallets (tenant_id, balance, currency)
            VALUES ($1, 500.00, 'INR')
            ON CONFLICT (tenant_id) DO UPDATE 
            SET balance = 500.00 -- Top up to 500
        `, [existingTenant.id]);

        // 4. Create Config
        console.log(`   Creating Voice Config...`);
        await client.query(`
            INSERT INTO tenant_voice_config (tenant_id, preset_id, voice_persona_id)
            VALUES ($1, 'standard', 'maya')
            ON CONFLICT (tenant_id) DO NOTHING
        `, [existingTenant.id]);

        await client.query('COMMIT');

        console.log('\n✅ SEEDING COMPLETE');
        console.log('---------------------------------------------------');
        console.log(`TENANT_ID:  ${existingTenant.id}`);

        // Generate a valid JWT for this user
        const token = jwt.sign(
            {
                sub: existingTenant.user_id, // Standard JWT sub
                user_id: existingTenant.user_id, // Our custom claim
                role: 'authenticated',
                app_metadata: { provider: 'email' },
                user_metadata: {},
                aud: 'authenticated',
                exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24 * 365) // 1 year
            },
            SECRET
        );

        console.log(`AUTH_TOKEN: ${token}`);
        console.log('---------------------------------------------------');
        console.log('👉 Save these credentials to test the API.');

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Seeding Failed:', error);
    } finally {
        client.release();
        process.exit(0);
    }
}

main();
