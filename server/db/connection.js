const { Pool } = require('pg');
require('dotenv').config();

const connectionString = process.env.DATABASE_URL;
const isExternal = connectionString && (connectionString.includes('render.com') || connectionString.includes('supabase') || connectionString.includes('neon'));

const pool = new Pool({
    connectionString: connectionString,
    ssl: isExternal ? { rejectUnauthorized: false } : false,
});

// Test connection
pool.on('connect', () => {
    console.log('Connected to the PostgreSQL database');
});

pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
    process.exit(-1);
});

module.exports = {
    query: (text, params) => pool.query(text, params),
    pool // Export the pool itself for more complex transactions if needed
};
