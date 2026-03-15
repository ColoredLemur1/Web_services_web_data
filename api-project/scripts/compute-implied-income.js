/**
 * Compute an implied average borrower income for the United Kingdom
 * by combining:
 * - table28.csv (average price All dwellings)
 * - table30.csv (price/income ratio All dwellings)
 *
 * For each year where both are available, income ≈ price / (price_income_ratio).
 * We then pick the latest year and write that income into regions.implied_avg_borrower_income
 * and regions.implied_income_year for the UK region (gss_code K02000001).
 *
 * Run from api-project root:
 *   node scripts/compute-implied-income.js
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
const TABLE30_CSV = path.join(DATA_DIR, 'table30.csv');

function toNum(val) {
  if (val === '' || val === null || val === undefined) return null;
  const n = parseFloat(String(val).replace(/,/g, ''));
  return Number.isNaN(n) ? null : n;
}

function parseTable28AllPrices() {
  if (!fs.existsSync(TABLE28_CSV)) {
    throw new Error(`table28.csv not found at ${TABLE28_CSV}`);
  }
  const raw = fs.readFileSync(TABLE28_CSV, 'utf8');
  const rows = parse(raw, { relax_column_count: true, skip_empty_lines: true, bom: true });

  const pricesByYear = new Map();

  let dataStart = -1;
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const first = Array.isArray(row) ? row[0] : row && row[0];
    if (/^\d{4}$/.test(String(first).trim())) {
      dataStart = i;
      break;
    }
  }
  if (dataStart < 0) {
    throw new Error('No year rows found in table28.csv');
  }

  for (let i = dataStart; i < rows.length; i++) {
    const row = Array.isArray(rows[i]) ? rows[i] : Object.values(rows[i] || {});
    const year = parseInt(String(row[0]).trim(), 10);
    if (Number.isNaN(year) || year < 1900 || year > 2100) break;

    // table28 layout: year, , New, , Other, , All, , FTB, , FOO
    const priceAll = toNum(row[6]);
    if (priceAll != null) {
      pricesByYear.set(year, priceAll);
    }
  }

  return pricesByYear;
}

function parseTable30AllPriceIncomeRatios() {
  if (!fs.existsSync(TABLE30_CSV)) {
    throw new Error(`table30.csv not found at ${TABLE30_CSV}`);
  }
  const raw = fs.readFileSync(TABLE30_CSV, 'utf8');
  const rows = parse(raw, { relax_column_count: true, skip_empty_lines: true, bom: true });

  const ratiosByYear = new Map();

  let dataStart = -1;
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const first = Array.isArray(row) ? row[0] : row && row[0];
    if (/^\d{4}$/.test(String(first).trim())) {
      dataStart = i;
      break;
    }
  }
  if (dataStart < 0) {
    throw new Error('No year rows found in table30.csv');
  }

  for (let i = dataStart; i < rows.length; i++) {
    const row = Array.isArray(rows[i]) ? rows[i] : Object.values(rows[i] || {});
    const year = parseInt(String(row[0]).trim(), 10);
    if (Number.isNaN(year) || year < 1900 || year > 2100) break;

    // table30 layout: year, , [New adv/price, price/income, adv/income], , [Other...], , [All...]
    // For All dwellings, price/income ratio is at index 11.
    const ratioAll = toNum(row[11]);
    if (ratioAll != null && ratioAll > 0) {
      ratiosByYear.set(year, ratioAll);
    }
  }

  return ratiosByYear;
}

async function getUnitedKingdomRegionId(client) {
  const byGss = await client.query('SELECT id FROM regions WHERE gss_code = $1', ['K02000001']);
  if (byGss.rows.length > 0) return byGss.rows[0].id;

  const byName = await client.query('SELECT id FROM regions WHERE name ILIKE $1', ['United Kingdom']);
  if (byName.rows.length > 0) {
    await client.query('UPDATE regions SET gss_code = $1 WHERE id = $2', ['K02000001', byName.rows[0].id]);
    return byName.rows[0].id;
  }

  const ins = await client.query(
    'INSERT INTO regions (name, gss_code) VALUES ($1, $2) RETURNING id',
    ['United Kingdom', 'K02000001']
  );
  return ins.rows[0].id;
}

async function run() {
  const pricesByYear = parseTable28AllPrices();
  const ratiosByYear = parseTable30AllPriceIncomeRatios();

  let latestYear = null;
  let latestIncome = null;

  for (const [year, price] of pricesByYear.entries()) {
    const ratio = ratiosByYear.get(year);
    if (ratio == null || ratio <= 0) continue;
    const income = price / ratio;
    if (latestYear == null || year > latestYear) {
      latestYear = year;
      latestIncome = income;
    }
  }

  if (latestYear == null || latestIncome == null) {
    throw new Error('Could not find overlapping years with valid price and price/income data');
  }

  const client = await pool.connect();
  try {
    const ukRegionId = await getUnitedKingdomRegionId(client);
    console.log('United Kingdom region id =', ukRegionId);
    console.log(
      `Latest implied income year=${latestYear}, price/income derived income ≈ ${latestIncome.toFixed(2)}`
    );

    await client.query(
      `UPDATE regions
       SET implied_avg_borrower_income = $1,
           implied_income_year = $2
       WHERE id = $3`,
      [latestIncome, latestYear, ukRegionId]
    );

    console.log('Updated regions.implied_avg_borrower_income and implied_income_year for United Kingdom.');
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});

