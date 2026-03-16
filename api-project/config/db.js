/**
 * PostgreSQL connection pool. Loads DB_ env from .env. Used by app and scripts.
 */

const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

console.log('Attempting to connect with User:', process.env.DB_USER);
console.log('Is Password defined?:', process.env.DB_PASSWORD);

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 30000,
});
module.exports = pool;