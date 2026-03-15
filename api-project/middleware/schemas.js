/**
 * Joi validation schemas for request body, query, and params.
 * Used by validateJoi middleware to harden endpoints and prevent invalid input.
 */

const Joi = require('joi');

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const GSS_PATTERN = /^[A-Za-z0-9]{1,20}$/;

const positiveInt = Joi.number().integer().min(1);
const nonNegativeInt = Joi.number().integer().min(0);
const yearSchema = Joi.number().integer().min(1900).max(2100);
const dateSchema = Joi.string().pattern(DATE_PATTERN).message('must be YYYY-MM-DD');

// ----- Regions (POST /api/regions, PUT /api/regions/:id) -----

const regionCreateBody = Joi.object({
  name: Joi.string().trim().min(1).max(255).required()
    .messages({ 'string.empty': 'name is required and must be a non-empty string' }),
  gss_code: Joi.string().trim().max(20).pattern(GSS_PATTERN).allow(null, '').optional()
    .messages({ 'string.pattern.base': 'gss_code must be alphanumeric, max 20 characters' }),
}).required();

const regionUpdateBody = Joi.object({
  name: Joi.string().trim().min(1).max(255).optional()
    .messages({ 'string.empty': 'name must be a non-empty string when provided' }),
  gss_code: Joi.string().trim().max(20).pattern(GSS_PATTERN).allow(null, '').optional()
    .messages({ 'string.pattern.base': 'gss_code must be alphanumeric, max 20 characters' }),
}).min(1).required().messages({
  'object.min': 'At least one of name or gss_code is required',
});

const regionIdParam = Joi.object({
  id: positiveInt.required()
    .messages({ 'number.min': 'id must be a positive integer' }),
});

// ----- Affordability index (GET /api/affordability-index) -----

const affordabilityIndexQuery = Joi.object({
  salary: Joi.number().positive().required()
    .messages({
      'number.positive': 'salary must be a positive number (annual salary)',
      'any.required': 'salary query parameter is required',
    }),
  region_id: positiveInt.optional(),
  region_name: Joi.string().trim().max(255).optional().allow(''),
}).required();

// ----- Market summary (GET /api/analysis/market-summary, GET /api/analysis/:region_id) -----

const focusEnum = ['first_time_buyer', 'investor', 'rent_vs_buy'];

const marketSummaryQuery = Joi.object({
  region_id: positiveInt.optional(),
  region_name: Joi.string().trim().max(255).optional().allow(''),
  salary: Joi.number().positive().optional()
    .messages({ 'number.positive': 'salary must be a positive number (annual salary in GBP)' }),
  focus: Joi.string().valid(...focusEnum).optional()
    .messages({ 'any.only': `focus must be one of: ${focusEnum.join(', ')}` }),
  property_type_id: positiveInt.optional()
    .messages({ 'number.min': 'property_type_id must be a positive integer' }),
}).required();

const analysisRegionIdParam = Joi.object({
  region_id: positiveInt.required()
    .messages({ 'number.min': 'region_id must be a positive integer' }),
}).required();

// ----- List endpoints: shared query shape -----

const baseListQuery = {
  limit: nonNegativeInt.optional(),
  offset: nonNegativeInt.optional(),
  year: yearSchema.optional(),
  period_from: dateSchema.optional(),
  period_to: dateSchema.optional(),
  region_id: positiveInt.optional(),
  region_name: Joi.string().trim().max(255).optional().allow(''),
};

const housingSalesQuery = Joi.object({
  ...baseListQuery,
  property_type_id: positiveInt.optional(),
  is_new_build: Joi.boolean().optional(),
  min_price: Joi.number().min(0).optional(),
  max_price: Joi.number().min(0).optional(),
}).required();

const housingSalesByBuyerQuery = Joi.object({
  ...baseListQuery,
  category_id: positiveInt.optional(),
  min_price: Joi.number().min(0).optional(),
  max_price: Joi.number().min(0).optional(),
}).required();

const affordabilityMetricsQuery = Joi.object({
  ...baseListQuery,
  category_id: positiveInt.optional(),
}).required();

const rentalMetricsQuery = Joi.object({
  ...baseListQuery,
  min_rent: Joi.number().min(0).optional(),
  max_rent: Joi.number().min(0).optional(),
}).required();

// ----- Auth (POST /auth/register, POST /auth/login) -----

const authRegisterBody = Joi.object({
  email: Joi.string().email().trim().lowercase().required()
    .messages({ 'string.email': 'email must be a valid email address' }),
  password: Joi.string().min(8).required()
    .messages({ 'string.min': 'password must be at least 8 characters' }),
}).required();

const authLoginBody = Joi.object({
  email: Joi.string().email().trim().lowercase().required(),
  password: Joi.string().required().messages({ 'any.required': 'password is required' }),
}).required();

module.exports = {
  regionCreateBody,
  regionUpdateBody,
  regionIdParam,
  affordabilityIndexQuery,
  marketSummaryQuery,
  analysisRegionIdParam,
  housingSalesQuery,
  housingSalesByBuyerQuery,
  affordabilityMetricsQuery,
  rentalMetricsQuery,
  authRegisterBody,
  authLoginBody,
};
