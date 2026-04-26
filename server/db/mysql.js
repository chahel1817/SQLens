const mysql = require('mysql2/promise');
require('dotenv').config();

// We'll attempt a connection to MySQL for real-time telemetry
// Falls back to mock/silent if not available
let pool;

try {
    pool = mysql.createPool({
        host: process.env.MYSQL_HOST || 'localhost',
        user: process.env.MYSQL_USER || 'root',
        password: process.env.MYSQL_PASSWORD || '',
        database: process.env.MYSQL_DATABASE || 'mysql',
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
    });
    console.log('MySQL Telemetry Pool Initialized');
} catch (error) {
    console.warn('MySQL Telemetry Pool could not be initialized. Using mock telemetry.');
}

module.exports = pool;
