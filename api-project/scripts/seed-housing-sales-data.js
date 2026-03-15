/**
 * Seed housing_sales_data from UKHPI CSV files.
 * Uses ukhpi-united-kingdom-from-2025-02-01-to-2026-02-01.csv (full HPI + property types + new build/existing).
 * Requires: regions table, property_types table, housing_sales_data table.
 * Run from api-project root: node scripts/seed-housing-sales-data.js
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
const UKHPI_CSV = path.join(DATA_DIR, 'ukhpi-united-kingdom-from-2025-02-01-to-2026-02-01.csv');

// CSV column names from UKHPI (exact match)
const PROPERTY_TYPES = [
  'All property types',
  'Detached houses',
  'Semi-detached houses',
  'Terraced houses',
  'Flats and maisonettes',
];

function toNum(val) {
  if (val === '' || val === null || val === undefined) return null;
  const n = parseFloat(String(val).replace(/,/g, ''));
  return Number.isNaN(n) ? null : n;
}

function toInt(val) {
  const n = toNum(val);
  return n === null ? null : Math.round(n);
}

async function ensureRegion(client, name) {
  const res = await client.query(
    'SELECT id FROM regions WHERE name = $1',
    [name]
  );
  if (res.rows.length > 0) return res.rows[0].id;
  const ins = await client.query(
    'INSERT INTO regions (name) VALUES ($1) RETURNING id',
    [name]
  );
  return ins.rows[0].id;
}

async function ensurePropertyTypes(client) {
  // property_types table uses type_name (not name)
  const map = {};
  for (const typeName of PROPERTY_TYPES) {
    const res = await client.query(
      'SELECT id FROM property_types WHERE type_name = $1',
      [typeName]
    );
    if (res.rows.length > 0) {
      map[typeName] = res.rows[0].id;
    } else {
      const ins = await client.query(
        'INSERT INTO property_types (type_name) VALUES ($1) RETURNING id',
        [typeName]
      );
      map[typeName] = ins.rows[0].id;
    }
  }
  return map;
}

async function run() {
  if (!fs.existsSync(UKHPI_CSV)) {
    console.error('CSV not found:', UKHPI_CSV);
    process.exit(1);
  }

  const raw = fs.readFileSync(UKHPI_CSV, 'utf8');
  const rows = parse(raw, { columns: true, skip_empty_lines: true });

  const client = await pool.connect();

  try {
    const regionName = rows[0]?.Name || 'United Kingdom';
    const regionId = await ensureRegion(client, regionName);
    console.log('Region:', regionName, 'id=', regionId);

    const typeIds = await ensurePropertyTypes(client);
    console.log('Property types:', Object.keys(typeIds).length);

    // Clear existing data for this region so re-run is idempotent
    await client.query('DELETE FROM housing_sales_data WHERE region_id = $1', [regionId]);
    console.log('Cleared existing housing_sales_data for region', regionId);

    const insertSql = `
      INSERT INTO housing_sales_data (
        region_id, property_type_id, period, avg_price,
        annual_change_pct, monthly_change_pct, sales_volume,
        house_price_index, is_new_build
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `;

    let inserted = 0;

    for (const row of rows) {
      const period = row['Pivotable date'] || row['Period'];
      if (!period) continue;

      const salesVolumeAll = toInt(row['Sales volume All property types']) ?? toInt(row['Sales volume']);

      // 1) Property-type rows (is_new_build = false, same sales_volume for all types in this period)
      for (const ptype of PROPERTY_TYPES) {
        const avgPrice = toNum(row[`Average price ${ptype}`]);
        const annualChange = toNum(row[`Percentage change (yearly) ${ptype}`]);
        const monthlyChange = toNum(row[`Percentage change (monthly) ${ptype}`]);
        const hpi = toNum(row[`House price index ${ptype}`]);
        const typeId = typeIds[ptype];
        if (typeId == null) continue;

        await client.query(insertSql, [
          regionId,
          typeId,
          period,
          avgPrice,
          annualChange,
          monthlyChange,
          salesVolumeAll,
          hpi,
          false,
        ]);
        inserted++;
      }

      // 2) New build (property type = All property types, is_new_build = true)
      const newBuildAvg = toNum(row['Average price New build']);
      const newBuildAnnual = toNum(row['Percentage change (yearly) New build']);
      const newBuildMonthly = toNum(row['Percentage change (monthly) New build']);
      const newBuildHpi = toNum(row['House price index New build']);
      const newBuildVol = toInt(row['Sales volume New build']);

      await client.query(insertSql, [
        regionId,
        typeIds['All property types'],
        period,
        newBuildAvg,
        newBuildAnnual,
        newBuildMonthly,
        newBuildVol,
        newBuildHpi,
        true,
      ]);
      inserted++;

      // 3) Existing properties (property type = All property types, is_new_build = false)
      const existingAvg = toNum(row['Average price Existing properties']);
      const existingAnnual = toNum(row['Percentage change (yearly) Existing properties']);
      const existingMonthly = toNum(row['Percentage change (monthly) Existing properties']);
      const existingHpi = toNum(row['House price index Existing properties']);
      const existingVol = toInt(row['Sales volume Existing properties']);

      await client.query(insertSql, [
        regionId,
        typeIds['All property types'],
        period,
        existingAvg,
        existingAnnual,
        existingMonthly,
        existingVol,
        existingHpi,
        false,
      ]);
      inserted++;
    }

    console.log('Inserted', inserted, 'rows into housing_sales_data.');
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
