import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ===========================================
// MIGRATION RUNNER
// ===========================================

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

interface MigrationRecord {
    id: number;
    name: string;
    applied_at: Date;
}

async function ensureMigrationTable(client: pg.PoolClient): Promise<void> {
    await client.query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL UNIQUE,
      applied_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
}

async function getAppliedMigrations(client: pg.PoolClient): Promise<string[]> {
    const result = await client.query<MigrationRecord>(
        'SELECT name FROM _migrations ORDER BY id'
    );
    return result.rows.map(r => r.name);
}

async function recordMigration(client: pg.PoolClient, name: string): Promise<void> {
    await client.query(
        'INSERT INTO _migrations (name) VALUES ($1)',
        [name]
    );
}

async function removeMigrationRecord(client: pg.PoolClient, name: string): Promise<void> {
    await client.query(
        'DELETE FROM _migrations WHERE name = $1',
        [name]
    );
}

async function runMigrations(direction: 'up' | 'down' = 'up'): Promise<void> {
    const connectionString = process.env.DATABASE_URL;

    if (!connectionString) {
        console.error('❌ DATABASE_URL environment variable is required');
        process.exit(1);
    }

    const pool = new Pool({ connectionString });
    const client = await pool.connect();

    try {
        console.log(`🔄 Running migrations (${direction})...\n`);

        await ensureMigrationTable(client);
        const applied = await getAppliedMigrations(client);

        // Get migration files
        const files = fs.readdirSync(MIGRATIONS_DIR)
            .filter(f => f.endsWith('.sql') && !f.endsWith('.down.sql'))
            .sort();

        if (direction === 'up') {
            // Apply pending migrations
            const pending = files.filter(f => !applied.includes(f));

            if (pending.length === 0) {
                console.log('✅ All migrations are up to date');
                return;
            }

            for (const file of pending) {
                console.log(`📄 Applying: ${file}`);

                const filePath = path.join(MIGRATIONS_DIR, file);
                const sql = fs.readFileSync(filePath, 'utf-8');

                await client.query('BEGIN');

                try {
                    await client.query(sql);
                    await recordMigration(client, file);
                    await client.query('COMMIT');
                    console.log(`   ✅ Applied: ${file}`);
                } catch (error) {
                    await client.query('ROLLBACK');
                    console.error(`   ❌ Failed: ${file}`);
                    throw error;
                }
            }

            console.log(`\n✅ Applied ${pending.length} migration(s)`);

        } else {
            // Rollback last migration
            if (applied.length === 0) {
                console.log('⚠️  No migrations to rollback');
                return;
            }

            const lastMigration = applied.at(-1);
            if (!lastMigration) {
                console.log('⚠️  No migrations to rollback');
                return;
            }

            console.log(`🔙 Rolling back: ${lastMigration}`);

            // Look for corresponding down migration
            const downFile = lastMigration.replace('.sql', '.down.sql');
            const downPath = path.join(MIGRATIONS_DIR, downFile);

            if (!fs.existsSync(downPath)) {
                console.error(`❌ No down migration found: ${downFile}`);
                console.log('   Create a down migration file or manually rollback.');
                process.exit(1);
            }

            const sql = fs.readFileSync(downPath, 'utf-8');

            await client.query('BEGIN');

            try {
                await client.query(sql);
                await removeMigrationRecord(client, lastMigration);
                await client.query('COMMIT');
                console.log(`   ✅ Rolled back: ${lastMigration}`);
            } catch (error) {
                await client.query('ROLLBACK');
                console.error(`   ❌ Rollback failed: ${lastMigration}`);
                throw error;
            }
        }

    } finally {
        client.release();
        await pool.end();
    }
}

// ===========================================
// CLI
// ===========================================

const args = process.argv.slice(2);
const direction = args.includes('--down') ? 'down' : 'up';

runMigrations(direction)
    .then(() => {
        console.log('\n👋 Done!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n❌ Migration failed:', error.message);
        if (process.env.DEBUG) {
            console.error(error);
        }
        process.exit(1);
    });
