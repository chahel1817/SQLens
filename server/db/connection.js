const { Pool } = require('pg');
require('dotenv').config();

const connectionString = process.env.DATABASE_URL;
const isExternal = connectionString && (connectionString.includes('render.com') || connectionString.includes('supabase') || connectionString.includes('neon'));

const pool = new Pool({
    connectionString: connectionString,
    ssl: isExternal ? { rejectUnauthorized: false } : false,
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

module.exports = {
    query: queryWithRetry,
    pool // Export the pool itself for more complex transactions if needed
};
