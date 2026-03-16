/**
 * Runs all SQL migration files in scripts/sql in filename order. Uses same DB config as the app.
 *
 * Run from api project root:
 *   node scripts/run-sql-migrations.js
 */

const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT || 5433,
});

const SQL_DIR = path.resolve(__dirname, 'sql');

function splitStatements(sql) {
  return sql
    .split(';')
    .map((s) => s.replace(/--[^\n]*/g, '').trim())
    .filter((s) => s.length > 0);
}

async function run() {
  const files = fs.readdirSync(SQL_DIR).filter((f) => f.endsWith('.sql')).sort();
  const client = await pool.connect();

  try {
    for (const file of files) {
      const filePath = path.join(SQL_DIR, file);
      const sql = fs.readFileSync(filePath, 'utf8');
      const statements = splitStatements(sql);

      for (const statement of statements) {
        await client.query(statement);
      }
      console.log('Ran:', file);
    }
    console.log('Migrations complete.');
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
