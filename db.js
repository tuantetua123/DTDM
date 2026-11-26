require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionTimeoutMillis: 3000,
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

module.exports = pool;
