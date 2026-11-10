const { Pool } = require('pg');
require('dotenv').config();

const connectionString = process.env.DATABASE_URL;
const isExternal = connectionString && (connectionString.includes('render.com') || connectionString.includes('supabase') || connectionString.includes('neon'));

const pool = new Pool({
    connectionString: connectionString,
    ssl: isExternal ? { rejectUnauthorized: false } : false
});

const init = async () => {
    console.log("⏳ Connecting to Database...");

    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                email VARCHAR(255) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                schema_name VARCHAR(255) UNIQUE NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log("✅ 'users' table is ready.");

        await pool.query(`
            CREATE TABLE IF NOT EXISTS query_history (
                id SERIAL PRIMARY KEY,
                user_id INT REFERENCES users(id),
                query_text TEXT NOT NULL,
                execution_time DOUBLE PRECISION,
                planning_time_ms DOUBLE PRECISION,
                execution_time_ms DOUBLE PRECISION,
                shared_hit_blocks BIGINT DEFAULT 0,
                shared_read_blocks BIGINT DEFAULT 0,
                used_index BOOLEAN DEFAULT FALSE,
                seq_scan_count INT DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            CREATE INDEX IF NOT EXISTS idx_history_user ON query_history(user_id);
            CREATE INDEX IF NOT EXISTS idx_history_time ON query_history(created_at);
            CREATE INDEX IF NOT EXISTS idx_history_user_created ON query_history(user_id, created_at DESC);
        `);
        console.log("✅ 'query_history' table and indexes are ready.");

        console.log("🚀 SUCCESS! Your database is completely set up and ready for deployment!");
    } catch (e) {
        console.error("❌ Error setting up database:", e);
    } finally {
        pool.end();
    }
};

init();
