/**
 * Seed housing_sales_by_buyer_dwelling from table28.csv (Table 23: prices by new/other dwellings and buyer type).
 * Requires: regions (with id), buyer_dwelling_categories, housing_sales_by_buyer_dwelling.
 * Run from api-project root: node scripts/seed-housing-sales-by-buyer-dwelling.js
 */

const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT || 5433,
});

const DATA_DIR = path.resolve(__dirname, '../data');
const TABLE28_CSV = path.join(DATA_DIR, 'table28.csv');

const CATEGORY_ORDER = [
  'New dwellings',
  'Other dwellings',
  'All dwellings',
  'First time buyers',
  'Former owner occupiers',
];
const PRICE_COL_INDICES = [2, 4, 6, 8, 10];

function toNum(val) {
  if (val === '' || val === null || val === undefined) return null;
  const n = parseFloat(String(val).replace(/,/g, ''));
  return Number.isNaN(n) ? null : n;
}

async function getRegionIdByGss(client, gssCode) {
  const res = await client.query(
    'SELECT id FROM regions WHERE gss_code = $1',
    [gssCode]
  );
  if (res.rows.length > 0) return res.rows[0].id;
  const byName = await client.query(
    'SELECT id FROM regions WHERE name ILIKE $1',
    ['United Kingdom']
  );
  if (byName.rows.length > 0) {
    await client.query(
      'UPDATE regions SET gss_code = $1 WHERE id = $2',
      [gssCode, byName.rows[0].id]
    );
    return byName.rows[0].id;
  }
  const ins = await client.query(
    'INSERT INTO regions (name, gss_code) VALUES ($1, $2) RETURNING id',
    ['United Kingdom', gssCode]
  );
  return ins.rows[0].id;
}

async function getCategoryIds(client) {
  const res = await client.query('SELECT id, name FROM buyer_dwelling_categories');
  const map = {};
  for (const row of res.rows) map[row.name] = row.id;
  return map;
}

async function run() {
  if (!fs.existsSync(TABLE28_CSV)) {
    console.error('CSV not found:', TABLE28_CSV);
    process.exit(1);
  }

  const raw = fs.readFileSync(TABLE28_CSV, 'utf8');
  const rows = parse(raw, { relax_column_count: true, skip_empty_lines: true, bom: true });

  const client = await pool.connect();

  try {
    const regionId = await getRegionIdByGss(client, 'K02000001');
    console.log('Region UK id=', regionId);

    const categoryIds = await getCategoryIds(client);
    const missing = CATEGORY_ORDER.filter((c) => !categoryIds[c]);
    if (missing.length) {
      console.error('Missing buyer_dwelling_categories:', missing);
      process.exit(1);
    }

    let dataStart = -1;
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const first = Array.isArray(row) ? row[0] : (row && row[0]);
      if (/^\d{4}$/.test(String(first).trim())) {
        dataStart = i;
        break;
      }
    }
    if (dataStart < 0) {
      console.error('No data rows found in table28.csv');
      process.exit(1);
    }

    await client.query(
      'DELETE FROM housing_sales_by_buyer_dwelling WHERE region_id = $1',
      [regionId]
    );
    console.log('Cleared existing housing_sales_by_buyer_dwelling for region', regionId);

    const insertSql = `
      INSERT INTO housing_sales_by_buyer_dwelling (region_id, category_id, period, avg_price)
      VALUES ($1, $2, $3, $4)
    `;

    let inserted = 0;
    for (let i = dataStart; i < rows.length; i++) {
      const row = Array.isArray(rows[i]) ? rows[i] : Object.values(rows[i] || {});
      const year = parseInt(String(row[0]).trim(), 10);
      if (Number.isNaN(year) || year < 1900 || year > 2100) break;

      const period = `${year}-01-01`;

      for (let c = 0; c < CATEGORY_ORDER.length; c++) {
        const categoryId = categoryIds[CATEGORY_ORDER[c]];
        const price = toNum(row[PRICE_COL_INDICES[c]]);
        await client.query(insertSql, [regionId, categoryId, period, price]);
        inserted++;
      }
    }

    console.log('Inserted', inserted, 'rows into housing_sales_by_buyer_dwelling.');
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
