import pg from 'pg';
import { config } from '../../core/index.js';
import { observeMetric } from '../../shared/index.js';

const { Pool } = pg;

// ===========================================
// DATABASE CONNECTION POOL
// ===========================================
export const pool = new Pool({
    connectionString: config.database.url,
    max: config.database.poolMax,
    idleTimeoutMillis: config.database.idleTimeoutMs,
    connectionTimeoutMillis: config.database.connectTimeoutMs,
    // Supabase requires SSL — without this, connections fail on some networks
    ssl: { rejectUnauthorized: false },
});

// ===========================================
// QUERY HELPERS
// ===========================================

/**
 * Execute a single query
 */
export async function query<T extends pg.QueryResultRow = any>(
    text: string,
    params?: any[]
): Promise<pg.QueryResult<T>> {
    const start = Date.now();
    const result = await pool.query<T>(text, params);
    const duration = Date.now() - start;
    observeMetric('db.query.duration_ms', duration);

    if (config.server.isDev && duration > 100) {
        console.log('Slow query:', { text: text.slice(0, 100), duration, rows: result.rowCount });
    }

    return result;
}

/**
 * Execute a query and return the first row or null
 */
export async function queryOne<T extends pg.QueryResultRow = any>(
    text: string,
    params?: any[]
): Promise<T | null> {
    const result = await query<T>(text, params);
    return result.rows[0] ?? null;
}

/**
 * Execute a query and return all rows
 */
export async function queryMany<T extends pg.QueryResultRow = any>(
    text: string,
    params?: any[]
): Promise<T[]> {
    const result = await query<T>(text, params);
    return result.rows;
}

// ===========================================
// TRANSACTION HELPER
// ===========================================

export type TransactionClient = pg.PoolClient;

/**
 * Execute a function within a database transaction
 * Automatically commits on success, rolls back on error
 */
export async function withTransaction<T>(
    fn: (client: TransactionClient) => Promise<T>
): Promise<T> {
    const client = await pool.connect();

    try {
        await client.query('BEGIN');
        const result = await fn(client);
        await client.query('COMMIT');
        return result;
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}

/**
 * Execute a single query within a transaction client
 */
export async function txQuery<T extends pg.QueryResultRow = any>(
    client: TransactionClient,
    text: string,
    params?: any[]
): Promise<pg.QueryResult<T>> {
    return client.query<T>(text, params);
}

/**
 * Execute a query and return first row within transaction
 */
export async function txQueryOne<T extends pg.QueryResultRow = any>(
    client: TransactionClient,
    text: string,
    params?: any[]
): Promise<T | null> {
    const result = await txQuery<T>(client, text, params);
    return result.rows[0] ?? null;
}

// ===========================================
// HEALTH CHECK
// ===========================================
export async function checkDatabaseConnection(): Promise<boolean> {
    try {
        await query('SELECT 1');
        return true;
    } catch (error) {
        console.error('Database connection failed:', error);
        return false;
    }
}

// ===========================================
// CLEANUP
// ===========================================
export async function closeDatabasePool(): Promise<void> {
    await pool.end();
}
