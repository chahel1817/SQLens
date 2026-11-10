const { Pool } = require('pg');
require('dotenv').config();

const connectionString = process.env.DATABASE_URL;
const isExternal = connectionString && (connectionString.includes('render.com') || connectionString.includes('supabase') || connectionString.includes('neon'));

const pool = new Pool({
    connectionString: connectionString,
    ssl: isExternal ? { rejectUnauthorized: false } : false,
    max: 10,
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 30000,
    keepAlive: true,
});

// Test connection
pool.on('connect', () => {
    console.log('Connected to the PostgreSQL database');
});

pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
    // removed process.exit(-1) so server doesn't crash if Neon/Render drops idle connections
});

const queryWithRetry = async (text, params, retries = 3) => {
    for (let i = 0; i < retries; i++) {
        try {
            return await pool.query(text, params);
        } catch (err) {
            if (i === retries - 1) throw err;
            if (err.message.includes('Connection terminated unexpectedly') || err.message.includes('server closed the connection unexpectedly')) {
                console.warn(`Query failed due to dropped connection, retrying (${i + 1}/${retries})...`);
                await new Promise(res => setTimeout(res, 500));
            } else {
                throw err;
            }
        }
    }
};

let schemaMigrationPromise = null;

const ensureTelemetrySchema = () => {
    if (!schemaMigrationPromise) {
        schemaMigrationPromise = (async () => {
            try {
                await queryWithRetry(`
                    ALTER TABLE public.query_history
                        ADD COLUMN IF NOT EXISTS planning_time_ms DOUBLE PRECISION,
                        ADD COLUMN IF NOT EXISTS execution_time_ms DOUBLE PRECISION,
                        ADD COLUMN IF NOT EXISTS shared_hit_blocks BIGINT DEFAULT 0,
                        ADD COLUMN IF NOT EXISTS shared_read_blocks BIGINT DEFAULT 0,
                        ADD COLUMN IF NOT EXISTS used_index BOOLEAN DEFAULT FALSE,
                        ADD COLUMN IF NOT EXISTS seq_scan_count INT DEFAULT 0;
                `);

                await queryWithRetry(`
                    DO $$
                    BEGIN
                        IF EXISTS (
                            SELECT 1 FROM information_schema.columns
                            WHERE table_schema = 'public'
                              AND table_name = 'query_history'
                              AND column_name = 'execution_time'
                              AND data_type <> 'double precision'
                        ) THEN
                            ALTER TABLE public.query_history ALTER COLUMN execution_time TYPE DOUBLE PRECISION;
                        END IF;
                    END $$;
                `);

                await queryWithRetry(`
                    CREATE INDEX IF NOT EXISTS idx_history_user_created
                    ON public.query_history(user_id, created_at DESC);
                `);
            } catch (err) {
                console.warn('Telemetry schema migration check skipped/failed:', err.message);
            }
        })();
    }
    return schemaMigrationPromise;
};

const getPoolStats = () => ({
    total: pool.totalCount,
    idle: pool.idleCount,
    waiting: pool.waitingCount,
    active: Math.max(pool.totalCount - pool.idleCount, 0),
});

module.exports = {
    query: queryWithRetry,
    pool, // Export the pool itself for more complex transactions if needed
    ensureTelemetrySchema,
    getPoolStats,
};
