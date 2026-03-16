/**
 * Seeds rental metrics from rent.csv. Requires regions and rental metrics table.
 *
 * Run from api project root:
 *   node scripts/seed-rental-metrics.js
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
const RENT_CSV = path.join(DATA_DIR, 'rent.csv');

const MONTHS = {
  Jan: 1, Feb: 2, Mar: 3, Apr: 4, May: 5, Jun: 6,
  Jul: 7, Aug: 8, Sep: 9, Oct: 10, Nov: 11, Dec: 12,
};

function parsePeriod(str) {
  if (!str || typeof str !== 'string') return null;
  const trimmed = str.trim();
  const m = trimmed.match(/^([A-Za-z]{3})-(\d{4})$/);
  if (!m) return null;
  const month = MONTHS[m[1]];
  const year = m[2];
  if (!month) return null;
  return `${year}-${String(month).padStart(2, '0')}-01`;
}

function toNum(val) {
  if (val === '' || val === null || val === undefined) return null;
  const s = String(val).replace(/,/g, '').replace(/^£/, '').trim();
  if (s === '[x]' || s === '[z]') return null;
  const n = parseFloat(s);
  return Number.isNaN(n) ? null : n;
}

async function getOrCreateRegion(client, areaCode, areaName) {
  if (areaCode && areaCode !== '[z]') {
    const byGss = await client.query(
      'SELECT id FROM regions WHERE gss_code = $1',
      [areaCode]
    );
    if (byGss.rows.length > 0) return byGss.rows[0].id;
    const byName = await client.query(
      'SELECT id FROM regions WHERE name ILIKE $1',
      [areaName || areaCode]
    );
    if (byName.rows.length > 0) {
      await client.query(
        'UPDATE regions SET gss_code = $1 WHERE id = $2',
        [areaCode, byName.rows[0].id]
      );
      return byName.rows[0].id;
    }
    const ins = await client.query(
      'INSERT INTO regions (name, gss_code) VALUES ($1, $2) RETURNING id',
      [areaName || areaCode, areaCode]
    );
    return ins.rows[0].id;
  }
  if (areaName) {
    const byName = await client.query(
      'SELECT id FROM regions WHERE name ILIKE $1',
      [areaName]
    );
    if (byName.rows.length > 0) return byName.rows[0].id;
    const ins = await client.query(
      'INSERT INTO regions (name) VALUES ($1) RETURNING id',
      [areaName]
    );
    return ins.rows[0].id;
  }
  return null;
}

async function run() {
  if (!fs.existsSync(RENT_CSV)) {
    console.error('CSV not found:', RENT_CSV);
    process.exit(1);
  }

  const raw = fs.readFileSync(RENT_CSV, 'utf8');
  const rows = parse(raw, { columns: true, skip_empty_lines: true, from_line: 3, bom: true });

  const client = await pool.connect();

  try {
    const insertSql = `
      INSERT INTO rental_metrics (
        region_id, period, rental_price_all, annual_change_pct,
        rental_price_one_bed, rental_price_four_plus_bed,
        rental_price_detached, rental_price_terraced, rental_price_flat_maisonette
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (region_id, period) DO UPDATE SET
        rental_price_all = EXCLUDED.rental_price_all,
        annual_change_pct = EXCLUDED.annual_change_pct,
        rental_price_one_bed = EXCLUDED.rental_price_one_bed,
        rental_price_four_plus_bed = EXCLUDED.rental_price_four_plus_bed,
        rental_price_detached = EXCLUDED.rental_price_detached,
        rental_price_terraced = EXCLUDED.rental_price_terraced,
        rental_price_flat_maisonette = EXCLUDED.rental_price_flat_maisonette
    `;

    let inserted = 0;

    for (const row of rows) {
      const period = parsePeriod(row['Time period']);
      if (!period) continue;

      const areaCode = (row['Area code'] || '').trim();
      const areaName = (row['Area name'] || '').trim();
      const regionId = await getOrCreateRegion(client, areaCode, areaName);
      if (!regionId) continue;

      const rentalPriceAll = toNum(row['Rental price']);
      const annualChangePct = toNum(row['Annual change']);
      const rentalPriceOneBed = toNum(row['Rental price one bed']);
      const rentalPriceFourPlusBed = toNum(row['Rental price four or more bed']);
      const rentalPriceDetached = toNum(row['Rental price detached']);
      const rentalPriceTerraced = toNum(row['Rental price terraced']);
      const rentalPriceFlatMaisonette = toNum(row['Rental price flat maisonette']);

      await client.query(insertSql, [
        regionId,
        period,
        rentalPriceAll,
        annualChangePct,
        rentalPriceOneBed,
        rentalPriceFourPlusBed,
        rentalPriceDetached,
        rentalPriceTerraced,
        rentalPriceFlatMaisonette,
      ]);
      inserted++;
    }

    console.log('Inserted/updated', inserted, 'rows in rental_metrics.');
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
