/**
 * Seeds property types lookup table. Inserts the five UKHPI property types if not present. Idempotent.
 *
 * Run from api project root:
 *   node scripts/seed-property-types.js
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

const PROPERTY_TYPES = [
  'All property types',
  'Detached houses',
  'Semi-detached houses',
  'Terraced houses',
  'Flats and maisonettes',
];

async function run() {
  const client = await pool.connect();
  try {
    let inserted = 0;
    for (const typeName of PROPERTY_TYPES) {
      const res = await client.query(
        'SELECT id FROM property_types WHERE type_name = $1',
        [typeName]
      );
      if (res.rows.length > 0) continue;
      await client.query(
        'INSERT INTO property_types (type_name) VALUES ($1)',
        [typeName]
      );
      inserted++;
    }
    console.log('Property types: ensured', PROPERTY_TYPES.length, 'rows; inserted', inserted);
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
