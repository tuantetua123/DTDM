require('dotenv').config({quiet:true});
const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 10000,
  max: 3,
  ...(process.env.DATABASE_URL ? {} : {ssl:false})
});
pool.on('error', err => console.error('Database pool:', err.message));
module.exports = pool;
