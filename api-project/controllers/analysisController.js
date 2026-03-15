/**
 * Expert Market Analysis: Gemini-powered endpoint that feeds PostgreSQL (HPI, rental,
 * affordability) data to the LLM to produce a grounded executive summary. GET only.
 */

const pool = require('../config/db');
const { createError } = require('../middleware/errorHandler');
const { getGeminiModel, isGeminiConfigured } = require('../config/gemini');

/**
 * Resolve region by id or name (default United Kingdom). Returns region row or null.
 */
async function resolveRegion(region_id, region_name) {
  if (region_id) {
    const res = await pool.query(
      'SELECT id, name, gss_code, implied_avg_borrower_income, implied_income_year FROM regions WHERE id = $1',
      [region_id]
    );
    return res.rows[0] || null;
  }
  const name = region_name && String(region_name).trim() ? String(region_name).trim() : 'United Kingdom';
  const res = await pool.query(
    'SELECT id, name, gss_code, implied_avg_borrower_income, implied_income_year FROM regions WHERE name ILIKE $1',
    [name]
  );
  return res.rows[0] || null;
}

/**
 * GET /api/analysis/market-summary or GET /api/analysis/:region_id
 * Data retrieval: latest rental, last 6 months HPI (house prices), latest price-to-income ratio.
 * Prompt: UK Real Estate Analyst; 150-word executive summary on market health from these numbers.
 */
const getMarketSummary = async (req, res, next) => {
  try {
    if (!isGeminiConfigured()) {
      return next(createError(503, 'AI insights are not configured. The deployer must set GEMINI_API_KEY.'));
    }

    const region_id = req.params.region_id != null ? req.params.region_id : req.query.region_id;
    const region_name = req.query.region_name;
    const salary = req.query.salary != null ? Number(req.query.salary) : null;
    const focus = req.query.focus || null;
    const property_type_id = req.query.property_type_id != null ? req.query.property_type_id : null;

    const regionRow = await resolveRegion(region_id, region_name);
    if (!regionRow) {
      return next(createError(404, 'Region not found for the specified parameters.'));
    }

    const regionId = regionRow.id;

    // If property_type_id provided, resolve it (for HPI filter)
    let propertyTypeName = 'All property types';
    let hpiPropertyTypeId = null;
    if (property_type_id) {
      const ptRes = await pool.query('SELECT id, type_name FROM property_types WHERE id = $1', [property_type_id]);
      if (!ptRes.rows[0]) {
        return next(createError(400, 'Invalid property_type_id. Use GET /api/property-types to list valid IDs.'));
      }
      propertyTypeName = ptRes.rows[0].type_name;
      hpiPropertyTypeId = ptRes.rows[0].id;
    }

    // Current average rent (rental table)
    const rentRes = await pool.query(
      `SELECT period, rental_price_all, annual_change_pct
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
    const impliedIncome = regionRow.implied_avg_borrower_income != null
      ? Number(regionRow.implied_avg_borrower_income)
      : null;
    const impliedYear = regionRow.implied_income_year || null;

    // Last 6 months of house prices from HPI table (property type: user choice or All property types, existing)
    const hpiRes = hpiPropertyTypeId
      ? await pool.query(
          `SELECT h.period, h.avg_price, h.annual_change_pct
           FROM housing_sales_data h
           WHERE h.region_id = $1 AND h.property_type_id = $2
             AND (h.is_new_build = false OR h.is_new_build IS NULL)
           ORDER BY h.period DESC
           LIMIT 6`,
          [regionId, hpiPropertyTypeId]
        )
      : await pool.query(
          `SELECT h.period, h.avg_price, h.annual_change_pct
           FROM housing_sales_data h
           WHERE h.region_id = $1
             AND h.property_type_id = (SELECT id FROM property_types WHERE type_name = 'All property types' LIMIT 1)
             AND (h.is_new_build = false OR h.is_new_build IS NULL)
           ORDER BY h.period DESC
           LIMIT 6`,
          [regionId]
        );
    const hpiRows = hpiRes.rows;
    const latestHpi = hpiRows[0] || null;
    const avgPrice = latestHpi && latestHpi.avg_price != null ? Number(latestHpi.avg_price) : null;
    const housePriceChangePct = latestHpi && latestHpi.annual_change_pct != null ? Number(latestHpi.annual_change_pct) : null;
    const housePricePeriod = latestHpi ? latestHpi.period : null;

    // Latest price-to-income ratio (affordability_metrics, All dwellings)
    const affRes = await pool.query(
      `SELECT a.period, a.price_income_ratio
       FROM affordability_metrics a
       WHERE a.region_id = $1
         AND a.category_id = (SELECT id FROM buyer_dwelling_categories WHERE name = 'All dwellings' LIMIT 1)
         AND a.price_income_ratio IS NOT NULL
       ORDER BY a.period DESC
       LIMIT 1`,
      [regionId]
    );
    const affRow = affRes.rows[0] || null;
    const priceToIncomeRatio = affRow && affRow.price_income_ratio != null ? Number(affRow.price_income_ratio) : null;
    const priceToIncomePeriod = affRow ? affRow.period : null;

    const rentToSalaryPct = salary && salary > 0 ? (annualRent / salary) * 100 : null;

    const dataSnapshot = {
      region_name: regionRow.name,
      latest_rent_period: rentRow.period,
      monthly_rent_gbp: monthlyRent,
      annual_rent_gbp: annualRent,
      rent_annual_change_pct: rentRow.annual_change_pct != null ? Number(rentRow.annual_change_pct) : null,
      implied_avg_borrower_income_gbp: impliedIncome,
      implied_income_year: impliedYear,
      avg_house_price_gbp: avgPrice,
      house_price_period: housePricePeriod,
      house_price_annual_change_pct: housePriceChangePct,
      hpi_months_included: hpiRows.length,
      price_to_income_ratio: priceToIncomeRatio,
      price_to_income_period: priceToIncomePeriod,
      ...(salary != null && salary > 0 && { user_salary_gbp: salary, rent_to_salary_pct: rentToSalaryPct }),
      ...(focus && { focus }),
      ...(property_type_id && { property_type_id: Number(property_type_id), property_type_name: propertyTypeName }),
    };

    const dataLines = [
      `Region: ${regionRow.name}`,
      `Latest rental period: ${rentRow.period}`,
      `Average monthly rent (all property types): £${monthlyRent.toLocaleString('en-GB')}`,
      `Annual rent: £${annualRent.toLocaleString('en-GB')}`,
    ];
    if (rentRow.annual_change_pct != null) {
      dataLines.push(`Annual change in rent: ${Number(rentRow.annual_change_pct).toFixed(1)}%`);
    }
    if (salary != null && salary > 0) {
      dataLines.push(`User's annual salary: £${Math.round(salary).toLocaleString('en-GB')}`);
      dataLines.push(`At current rents, annual rent would be ${rentToSalaryPct.toFixed(1)}% of their salary.`);
    }
    if (avgPrice != null) {
      dataLines.push(`Average house price (HPI, ${propertyTypeName}, latest): £${Math.round(avgPrice).toLocaleString('en-GB')}`);
      if (housePriceChangePct != null) {
        dataLines.push(`House price annual change: ${housePriceChangePct.toFixed(1)}%`);
      }
      if (housePricePeriod) dataLines.push(`House price period: ${housePricePeriod}`);
    }
    if (priceToIncomeRatio != null) {
      dataLines.push(`Price-to-income ratio (All dwellings): ${priceToIncomeRatio.toFixed(1)}`);
      if (priceToIncomePeriod) dataLines.push(`Price-to-income period: ${priceToIncomePeriod}`);
    }
    if (impliedIncome != null) {
      dataLines.push(`Implied average borrower income (${impliedYear || 'latest'}): £${impliedIncome.toLocaleString('en-GB')}`);
    }

    const focusInstructions = {
      first_time_buyer: 'Focus your summary on first-time buyer affordability and what the data means for someone getting on the ladder.',
      investor: 'Focus your summary on investment outlook and yield/affordability from a buy-to-let or investor perspective.',
      rent_vs_buy: 'Focus your summary on the rent vs buy comparison and what the price-to-income and rental data suggest.',
    };
    const focusLine = focus && focusInstructions[focus]
      ? `\n${focusInstructions[focus]}`
      : '';

    const prompt = `You are a UK Real Estate Analyst. Here is the latest data for ${regionRow.name} (from official ONS and UKHPI sources):

${dataLines.join('\n')}
${focusLine}

Based on these specific numbers only, provide a 150-word executive summary on market health. Be concise and factual. Do not invent any figures.`;

    const model = getGeminiModel();
    let summaryText;
    try {
      const result = await model.generateContent(prompt);
      const response = result.response;
      if (!response || !response.text) {
        return next(createError(502, 'AI service returned an empty response.'));
      }
      summaryText = response.text();
    } catch (err) {
      console.error('Gemini API error:', err.message);
      return next(createError(502, 'AI service temporarily unavailable. Please try again later.'));
    }

    res.status(200).json({
      region: {
        id: regionRow.id,
        name: regionRow.name,
        gss_code: regionRow.gss_code,
      },
      summary: summaryText,
      data_snapshot: dataSnapshot,
      generated_at: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getMarketSummary,
};
