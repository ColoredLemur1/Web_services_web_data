/**
 * Seeds base regions. Creates United Kingdom with gss code K02000001 if not present. Idempotent.
 *
 * Run from api project root:
 *   node scripts/seed-regions.js
 */

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

const UK_GSS = 'K02000001';
const UK_NAME = 'United Kingdom';

async function run() {
  const client = await pool.connect();
  try {
    const byGss = await client.query(
      'SELECT id FROM regions WHERE gss_code = $1',
      [UK_GSS]
    );
    if (byGss.rows.length > 0) {
      console.log('United Kingdom (gss_code', UK_GSS + ') already exists, id =', byGss.rows[0].id);
      return;
    }

    const byName = await client.query(
      'SELECT id FROM regions WHERE name ILIKE $1',
      [UK_NAME]
    );
    if (byName.rows.length > 0) {
      await client.query(
        'UPDATE regions SET gss_code = $1 WHERE id = $2',
        [UK_GSS, byName.rows[0].id]
      );
      console.log('Updated existing region "' + UK_NAME + '" with gss_code', UK_GSS);
      return;
    }

    const ins = await client.query(
      'INSERT INTO regions (name, gss_code) VALUES ($1, $2) RETURNING id',
      [UK_NAME, UK_GSS]
    );
    console.log('Created region "' + UK_NAME + '" with gss_code', UK_GSS + ', id =', ins.rows[0].id);
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
