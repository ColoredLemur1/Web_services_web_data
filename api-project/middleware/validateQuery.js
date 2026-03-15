/**
 * Input validation for query parameters. Returns an error message string or null if valid.
 * Used by controllers before running queries; on non-null return, controller should next(createError(400, message)).
 */

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function parsePositiveInt(val, name) {
  if (val === undefined || val === '') return null;
  const n = parseInt(val, 10);
  if (Number.isNaN(n) || n < 0) return `${name} must be a non-negative integer`;
  return null;
}

function parsePositiveNum(val, name, allowZero = false) {
  if (val === undefined || val === '') return null;
  const n = parseFloat(val);
  if (Number.isNaN(n)) return `${name} must be a number`;
  if (n < 0) return `${name} must be non-negative`;
  if (!allowZero && n === 0) return `${name} must be greater than zero`;
  return null;
}

function parseYear(val) {
  if (val === undefined || val === '') return null;
  const n = parseInt(val, 10);
  if (Number.isNaN(n) || n < 1900 || n > 2100) return 'year must be between 1900 and 2100';
  return null;
}

function parseDate(val, name) {
  if (val === undefined || val === '') return null;
  const s = String(val).trim();
  if (!DATE_REGEX.test(s)) return `${name} must be YYYY-MM-DD`;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return `${name} must be a valid date`;
  return null;
}

/** Validation for housing-sales, housing-sales-by-buyer, affordability (GET), rental-metrics query params */
function validateListQuery(query, options = {}) {
  const { allowMinMaxPrice = false, allowMinMaxRent = false } = options;

  let msg =
    parsePositiveInt(query.limit, 'limit') ||
    parsePositiveInt(query.offset, 'offset') ||
    parseYear(query.year);
  if (msg) return msg;

  if (query.period_from) {
    msg = parseDate(query.period_from, 'period_from');
    if (msg) return msg;
  }
  if (query.period_to) {
    msg = parseDate(query.period_to, 'period_to');
    if (msg) return msg;
  }

  for (const key of ['region_id', 'property_type_id', 'category_id']) {
    if (query[key] === undefined || query[key] === '') continue;
    const n = parseInt(query[key], 10);
    if (Number.isNaN(n) || n < 1) return `${key} must be a positive integer`;
  }

  if (allowMinMaxPrice) {
    if (query.min_price !== undefined && query.min_price !== '') {
      msg = parsePositiveNum(query.min_price, 'min_price', true);
      if (msg) return msg;
    }
    if (query.max_price !== undefined && query.max_price !== '') {
      msg = parsePositiveNum(query.max_price, 'max_price', true);
      if (msg) return msg;
    }
    if (
      query.min_price !== undefined &&
      query.max_price !== undefined &&
      query.min_price !== '' &&
      query.max_price !== ''
    ) {
      const min = parseFloat(query.min_price);
      const max = parseFloat(query.max_price);
      if (!Number.isNaN(min) && !Number.isNaN(max) && min > max) {
        return 'min_price must be less than or equal to max_price';
      }
    }
  }

  if (allowMinMaxRent) {
    if (query.min_rent !== undefined && query.min_rent !== '') {
      msg = parsePositiveNum(query.min_rent, 'min_rent', true);
      if (msg) return msg;
    }
    if (query.max_rent !== undefined && query.max_rent !== '') {
      msg = parsePositiveNum(query.max_rent, 'max_rent', true);
      if (msg) return msg;
    }
    if (
      query.min_rent !== undefined &&
      query.max_rent !== undefined &&
      query.min_rent !== '' &&
      query.max_rent !== ''
    ) {
      const min = parseFloat(query.min_rent);
      const max = parseFloat(query.max_rent);
      if (!Number.isNaN(min) && !Number.isNaN(max) && min > max) {
        return 'min_rent must be less than or equal to max_rent';
      }
    }
  }

  return null;
}

/** Validation for affordability-index: salary required, positive number */
function validateAffordabilityIndexQuery(query) {
  if (query.salary === undefined || query.salary === '') {
    return 'salary query parameter is required';
  }
  const n = parseFloat(query.salary);
  if (Number.isNaN(n)) return 'salary must be a number';
  if (n <= 0) return 'salary must be a positive number (annual salary)';
  return null;
}

module.exports = {
  validateListQuery,
  validateAffordabilityIndexQuery,
  parsePositiveInt,
  parsePositiveNum,
  parseYear,
  parseDate,
};
