const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes('render.com') || process.env.DATABASE_URL.includes('supabase') || process.env.DATABASE_URL.includes('neon') ? { rejectUnauthorized: false } : false,
});

const fixSchema = async () => {
    console.log("🛠️ Checking and fixing database schema...");
    try {
        // 1. Ensure query_text exists
        const { rows: textRows } = await pool.query(`
            SELECT column_name FROM information_schema.columns 
            WHERE table_name = 'query_history' AND column_name = 'query_text'
        `);
        if (textRows.length === 0) {
            console.log("🆕 Adding 'query_text'...");
            await pool.query('ALTER TABLE query_history ADD COLUMN query_text TEXT NOT NULL DEFAULT \'\'');
        }

        // 2. Ensure query exists (some old logs might still look for it)
        const { rows: queryRows } = await pool.query(`
            SELECT column_name FROM information_schema.columns 
            WHERE table_name = 'query_history' AND column_name = 'query'
        `);
        if (queryRows.length === 0) {
            console.log("🆕 Adding 'query' (legacy support)...");
            await pool.query('ALTER TABLE query_history ADD COLUMN query TEXT NOT NULL DEFAULT \'\'');
        }

        console.log("🚀 Schema fix complete!");
    } catch (err) {
        console.error("❌ Error fixing schema:", err);
    } finally {
        await pool.end();
    }
};

fixSchema();
