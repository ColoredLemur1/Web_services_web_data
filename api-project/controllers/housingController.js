/**
 * Housing and lookup endpoints. Serves regions, property types, buyer dwelling categories, housing sales, affordability and rental metrics.
 */

const pool = require('../config/db');
const { createError } = require('../middleware/errorHandler');

const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 500;

/** Parse limit and offset from query and enforce defaults and max. */
function parseLimitOffset(query) {
  let limit = parseInt(query.limit, 10);
  let offset = parseInt(query.offset, 10);
  if (Number.isNaN(limit) || limit < 1) limit = DEFAULT_LIMIT;
  if (limit > MAX_LIMIT) limit = MAX_LIMIT;
  if (Number.isNaN(offset) || offset < 0) offset = 0;
  return { limit, offset };
}

/** GET housing sales data with joins to regions and property types. */
const getHousingSales = async (req, res, next) => {
  try {
    const {
      region_id,
      region_name,
      year,
      period_from,
      period_to,
      property_type_id,
      is_new_build,
      min_price,
      max_price,
      limit: limitParam,
      offset: offsetParam,
    } = req.query;

    if (min_price != null && max_price != null && min_price > max_price) {
      return next(createError(400, 'min_price must be less than or equal to max_price'));
    }
    const { limit, offset } = parseLimitOffset({ limit: limitParam, offset: offsetParam });

    const params = [];
    const conditions = [];

    let n = 1;
    if (region_id) {
      conditions.push(`h.region_id = $${n++}`);
      params.push(region_id);
    } else if (region_name) {
      conditions.push(`r.name ILIKE $${n++}`);
      params.push(String(region_name).trim());
    }
    let periodFrom = period_from;
    let periodTo = period_to;
    if (year && !periodFrom && !periodTo) {
      periodFrom = `${year}-01-01`;
      periodTo = `${year}-12-31`;
    }
    if (periodFrom) {
      conditions.push(`h.period >= $${n++}`);
      params.push(periodFrom);
    }
    if (periodTo) {
      conditions.push(`h.period <= $${n++}`);
      params.push(periodTo);
    }
    if (property_type_id) {
      conditions.push(`h.property_type_id = $${n++}`);
      params.push(property_type_id);
    }
    if (is_new_build !== undefined && is_new_build !== '') {
      conditions.push(`h.is_new_build = $${n++}`);
      params.push(is_new_build === 'true');
    }
    if (min_price !== undefined && min_price !== '') {
      const val = parseFloat(min_price);
      if (!Number.isNaN(val)) {
        conditions.push(`h.avg_price >= $${n++}`);
        params.push(val);
      }
    }
    if (max_price !== undefined && max_price !== '') {
      const val = parseFloat(max_price);
      if (!Number.isNaN(val)) {
        conditions.push(`h.avg_price <= $${n++}`);
        params.push(val);
      }
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    params.push(limit, offset);

    const sql = `
      SELECT
        h.id,
        h.region_id,
        r.name AS region_name,
        r.gss_code AS region_gss_code,
        h.property_type_id,
        p.type_name AS property_type_name,
        h.period,
        h.avg_price,
        h.annual_change_pct,
        h.monthly_change_pct,
        h.sales_volume,
        h.house_price_index,
        h.is_new_build
      FROM housing_sales_data h
      INNER JOIN regions r ON r.id = h.region_id
      INNER JOIN property_types p ON p.id = h.property_type_id
      ${whereClause}
      ORDER BY h.period DESC, h.property_type_id
      LIMIT $${n++} OFFSET $${n}
    `;

    const result = await pool.query(sql, params);
    res.status(200).json({
      count: result.rows.length,
      limit,
      offset,
      data: result.rows,
    });
  } catch (err) {
    next(err);
  }
};

/** GET housing sales by buyer dwelling with joins to regions and categories. */
const getHousingSalesByBuyerDwelling = async (req, res, next) => {
  try {
    const {
      region_id,
      region_name,
      year,
      period_from,
      period_to,
      category_id,
      min_price,
      max_price,
      limit: limitParam,
      offset: offsetParam,
    } = req.query;

    if (min_price != null && max_price != null && min_price > max_price) {
      return next(createError(400, 'min_price must be less than or equal to max_price'));
    }
    const { limit, offset } = parseLimitOffset({ limit: limitParam, offset: offsetParam });

    const params = [];
    const conditions = [];

    let n = 1;
    if (region_id) {
      conditions.push(`h.region_id = $${n++}`);
      params.push(region_id);
    } else if (region_name) {
      conditions.push(`r.name ILIKE $${n++}`);
      params.push(String(region_name).trim());
    }
    let periodFrom = period_from;
    let periodTo = period_to;
    if (year && !periodFrom && !periodTo) {
      periodFrom = `${year}-01-01`;
      periodTo = `${year}-12-31`;
    }
    if (periodFrom) {
      conditions.push(`h.period >= $${n++}`);
      params.push(periodFrom);
    }
    if (periodTo) {
      conditions.push(`h.period <= $${n++}`);
      params.push(periodTo);
    }
    if (category_id) {
      conditions.push(`h.category_id = $${n++}`);
      params.push(category_id);
    }
    if (min_price !== undefined && min_price !== '') {
      const val = parseFloat(min_price);
      if (!Number.isNaN(val)) {
        conditions.push(`h.avg_price >= $${n++}`);
        params.push(val);
      }
    }
    if (max_price !== undefined && max_price !== '') {
      const val = parseFloat(max_price);
      if (!Number.isNaN(val)) {
        conditions.push(`h.avg_price <= $${n++}`);
        params.push(val);
      }
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    params.push(limit, offset);

    const sql = `
      SELECT
        h.id,
        h.region_id,
        r.name AS region_name,
        r.gss_code AS region_gss_code,
        h.category_id,
        c.name AS category_name,
        h.period,
        h.avg_price
      FROM housing_sales_by_buyer_dwelling h
      INNER JOIN regions r ON r.id = h.region_id
      INNER JOIN buyer_dwelling_categories c ON c.id = h.category_id
      ${whereClause}
      ORDER BY h.period DESC, h.category_id
      LIMIT $${n++} OFFSET $${n}
    `;

    const result = await pool.query(sql, params);
    res.status(200).json({
      count: result.rows.length,
      limit,
      offset,
      data: result.rows,
    });
  } catch (err) {
    next(err);
  }
};

/** GET affordability metrics with joins to regions and buyer dwelling categories. */
const getAffordabilityMetrics = async (req, res, next) => {
  try {
    const {
      region_id,
      region_name,
      year,
      period_from,
      period_to,
      category_id,
      limit: limitParam,
      offset: offsetParam,
    } = req.query;

    const { limit, offset } = parseLimitOffset({ limit: limitParam, offset: offsetParam });

    const params = [];
    const conditions = [];

    let n = 1;
    if (region_id) {
      conditions.push(`a.region_id = $${n++}`);
      params.push(region_id);
    } else if (region_name) {
      conditions.push(`r.name ILIKE $${n++}`);
      params.push(String(region_name).trim());
    }
    let periodFrom = period_from;
    let periodTo = period_to;
    if (year && !periodFrom && !periodTo) {
      periodFrom = `${year}-01-01`;
      periodTo = `${year}-12-31`;
    }
    if (periodFrom) {
      conditions.push(`a.period >= $${n++}`);
      params.push(periodFrom);
    }
    if (periodTo) {
      conditions.push(`a.period <= $${n++}`);
      params.push(periodTo);
    }
    if (category_id) {
      conditions.push(`a.category_id = $${n++}`);
      params.push(category_id);
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    params.push(limit, offset);

    const sql = `
      SELECT
        a.id,
        a.region_id,
        r.name AS region_name,
        r.gss_code AS region_gss_code,
        a.category_id,
        c.name AS category_name,
        a.period,
        a.advance_price_pct,
        a.price_income_ratio,
        a.advance_income_ratio
      FROM affordability_metrics a
      INNER JOIN regions r ON r.id = a.region_id
      INNER JOIN buyer_dwelling_categories c ON c.id = a.category_id
      ${whereClause}
      ORDER BY a.period DESC, a.category_id
      LIMIT $${n++} OFFSET $${n}
    `;

    const result = await pool.query(sql, params);
    res.status(200).json({
      count: result.rows.length,
      limit,
      offset,
      data: result.rows,
    });
  } catch (err) {
    next(err);
  }
};

/** GET rental metrics with join to regions. */
const getRentalMetrics = async (req, res, next) => {
  try {
    const {
      region_id,
      region_name,
      year,
      period_from,
      period_to,
      min_rent,
      max_rent,
      limit: limitParam,
      offset: offsetParam,
    } = req.query;

    if (min_rent != null && max_rent != null && min_rent > max_rent) {
      return next(createError(400, 'min_rent must be less than or equal to max_rent'));
    }
    const { limit, offset } = parseLimitOffset({ limit: limitParam, offset: offsetParam });

    const params = [];
    const conditions = [];

    let n = 1;
    if (region_id) {
      conditions.push(`rm.region_id = $${n++}`);
      params.push(region_id);
    } else if (region_name) {
      conditions.push(`r.name ILIKE $${n++}`);
      params.push(String(region_name).trim());
    }
    let periodFrom = period_from;
    let periodTo = period_to;
    if (year && !periodFrom && !periodTo) {
      periodFrom = `${year}-01-01`;
      periodTo = `${year}-12-31`;
    }
    if (periodFrom) {
      conditions.push(`rm.period >= $${n++}`);
      params.push(periodFrom);
    }
    if (periodTo) {
      conditions.push(`rm.period <= $${n++}`);
      params.push(periodTo);
    }
    if (min_rent !== undefined && min_rent !== '') {
      const val = parseFloat(min_rent);
      if (!Number.isNaN(val)) {
        conditions.push(`rm.rental_price_all >= $${n++}`);
        params.push(val);
      }
    }
    if (max_rent !== undefined && max_rent !== '') {
      const val = parseFloat(max_rent);
      if (!Number.isNaN(val)) {
        conditions.push(`rm.rental_price_all <= $${n++}`);
        params.push(val);
      }
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    params.push(limit, offset);

    const sql = `
      SELECT
        rm.id,
        rm.region_id,
        r.name AS region_name,
        r.gss_code AS region_gss_code,
        rm.period,
        rm.rental_price_all,
        rm.annual_change_pct,
        rm.rental_price_one_bed,
        rm.rental_price_four_plus_bed,
        rm.rental_price_detached,
        rm.rental_price_terraced,
        rm.rental_price_flat_maisonette,
        rm.created_at
      FROM rental_metrics rm
      INNER JOIN regions r ON r.id = rm.region_id
      ${whereClause}
      ORDER BY rm.period DESC
      LIMIT $${n++} OFFSET $${n}
    `;

    const result = await pool.query(sql, params);
    res.status(200).json({
      count: result.rows.length,
      limit,
      offset,
      data: result.rows,
    });
  } catch (err) {
    next(err);
  }
};

/** GET list of regions for dropdowns and filtering. */
const getRegions = async (req, res, next) => {
  try {
    const result = await pool.query(
      'SELECT id, name, gss_code FROM regions ORDER BY name'
    );
    res.status(200).json({ count: result.rows.length, data: result.rows });
  } catch (err) {
    next(err);
  }
};

/** Create a region. Requires API key. */
const createRegion = async (req, res, next) => {
  try {
    const { name, gss_code } = req.body;
    const result = await pool.query(
      'INSERT INTO regions (name, gss_code) VALUES ($1, $2) RETURNING id, name, gss_code',
      [name, gss_code || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') return next(createError(409, 'A region with this name or gss_code already exists'));
    next(err);
  }
};

/** Update a region by id. Requires API key. At least one of name or gss code required. */
const updateRegion = async (req, res, next) => {
  try {
    const id = req.params.id;
    const { name, gss_code } = req.body;
    const updates = [];
    const values = [];
    let n = 1;
    if (name !== undefined) { updates.push(`name = $${n++}`); values.push(name); }
    if (gss_code !== undefined) { updates.push(`gss_code = $${n++}`); values.push(gss_code || null); }
    values.push(id);
    const result = await pool.query(
      `UPDATE regions SET ${updates.join(', ')} WHERE id = $${n} RETURNING id, name, gss_code`,
      values
    );
    if (result.rows.length === 0) return next(createError(404, 'Region not found'));
    res.status(200).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') return next(createError(409, 'A region with this name or gss_code already exists'));
    next(err);
  }
};

/** Delete a region by id. Requires API key. Cascades to related data. */
const deleteRegion = async (req, res, next) => {
  try {
    const id = req.params.id;
    const result = await pool.query('DELETE FROM regions WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) return next(createError(404, 'Region not found'));
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};

/** GET list of property types for filtering housing sales. */
const getPropertyTypes = async (req, res, next) => {
  try {
    const result = await pool.query('SELECT id, type_name FROM property_types ORDER BY id');
    res.status(200).json({ count: result.rows.length, data: result.rows });
  } catch (err) {
    next(err);
  }
};

/** GET list of buyer dwelling categories for filtering. */
const getBuyerDwellingCategories = async (req, res, next) => {
  try {
    const result = await pool.query('SELECT id, name FROM buyer_dwelling_categories ORDER BY id');
    res.status(200).json({ count: result.rows.length, data: result.rows });
  } catch (err) {
    next(err);
  }
};

/** Compares salary to region income and latest rent. Returns Affordable, Stretched or Unaffordable. */
const getAffordabilityIndex = async (req, res, next) => {
  try {
    const { salary: salaryNum, region_id, region_name } = req.query;

    let regionRow;
    if (region_id) {
      const regionRes = await pool.query(
        'SELECT id, name, gss_code, implied_avg_borrower_income, implied_income_year FROM regions WHERE id = $1',
        [region_id]
      );
      regionRow = regionRes.rows[0];
    } else if (region_name) {
      const regionRes = await pool.query(
        'SELECT id, name, gss_code, implied_avg_borrower_income, implied_income_year FROM regions WHERE name ILIKE $1',
        [String(region_name).trim()]
      );
      regionRow = regionRes.rows[0];
    } else {
      const regionRes = await pool.query(
        'SELECT id, name, gss_code, implied_avg_borrower_income, implied_income_year FROM regions WHERE name ILIKE $1',
        ['United Kingdom']
      );
      regionRow = regionRes.rows[0];
    }

    if (!regionRow) {
      return next(createError(404, 'Region not found for the specified parameters.'));
    }

    const regionId = regionRow.id;

    const rentRes = await pool.query(
      `SELECT period, rental_price_all
       FROM rental_metrics
       WHERE region_id = $1 AND rental_price_all IS NOT NULL
       ORDER BY period DESC
       LIMIT 1`,
      [regionId]
    );

    const rentRow = rentRes.rows[0];
    if (!rentRow) {
      return next(createError(404, 'No rental metrics found for this region.'));
    }

    const monthlyRent = Number(rentRow.rental_price_all);
    const annualRent = monthlyRent * 12;
    const annualSalary = salaryNum;
    const regionIncome =
      regionRow.implied_avg_borrower_income !== null &&
      regionRow.implied_avg_borrower_income !== undefined
        ? Number(regionRow.implied_avg_borrower_income)
        : null;
    const regionIncomeYear = regionRow.implied_income_year || null;

    const rentToSalaryRatio = annualRent / annualSalary;
    const rentToSalaryPct = rentToSalaryRatio * 100;

    let rentToRegionIncomePct = null;
    if (regionIncome && regionIncome > 0) {
      rentToRegionIncomePct = (annualRent / regionIncome) * 100;
    }

    const ONS_AFFORDABILITY_THRESHOLD_PCT = 30;
    const ONS_STRETCHED_MAX_PCT = 40;
    let healthScore;
    if (rentToSalaryPct <= ONS_AFFORDABILITY_THRESHOLD_PCT) {
      healthScore = 'Affordable';
    } else if (rentToSalaryPct <= ONS_STRETCHED_MAX_PCT) {
      healthScore = 'Stretched';
    } else {
      healthScore = 'Unaffordable';
    }

    res.status(200).json({
      region: {
        id: regionRow.id,
        name: regionRow.name,
        gss_code: regionRow.gss_code,
        implied_avg_borrower_income: regionRow.implied_avg_borrower_income,
        implied_income_year: regionIncomeYear,
      },
      inputs: {
        annual_salary: annualSalary,
      },
      rental_snapshot: {
        period: rentRow.period,
        monthly_rent_all_property_types: monthlyRent,
        annual_rent_all_property_types: annualRent,
      },
      ratios: {
        rent_to_salary_ratio: rentToSalaryRatio,
        rent_to_salary_percent: rentToSalaryPct,
        rent_to_region_income_percent: rentToRegionIncomePct,
      },
      health_score: healthScore,
      health_explanation:
        rentToRegionIncomePct != null
          ? `At current average rents in ${regionRow.name}, annual rent would consume approximately ${rentToSalaryPct.toFixed(
              1
            )}% of your salary, compared with ${rentToRegionIncomePct.toFixed(
              1
            )}% of implied borrower income${
              regionIncomeYear ? ' in ' + regionIncomeYear : ''
            }.`
          : `At current average rents in ${regionRow.name}, annual rent would consume approximately ${rentToSalaryPct.toFixed(
              1
            )}% of your salary.`,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getHousingSales,
  getHousingSalesByBuyerDwelling,
  getAffordabilityMetrics,
  getRentalMetrics,
  getRegions,
  createRegion,
  updateRegion,
  deleteRegion,
  getPropertyTypes,
  getBuyerDwellingCategories,
  getAffordabilityIndex,
};
