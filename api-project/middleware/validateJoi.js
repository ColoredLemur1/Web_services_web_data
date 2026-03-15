/**
 * Express middleware: validate req.body, req.query, or req.params with a Joi schema.
 * On failure passes next(createError(400, message)); on success assigns validated (and coerced) value back and calls next().
 */

const { createError } = require('./errorHandler');

/**
 * @param {import('joi').ObjectSchema} schema - Joi schema (object)
 * @param {'body'|'query'|'params'} source - which part of req to validate
 * @returns {function} Express middleware
 */
function validateJoi(schema, source = 'body') {
  return (req, res, next) => {
    const value = req[source];
    const { error, value: validated } = schema.validate(value, {
      abortEarly: true,
      stripUnknown: true,
      convert: true,
    });
    if (error) {
      const message = error.details && error.details[0] ? error.details[0].message : error.message;
      return next(createError(400, message));
    }
    req[source] = validated;
    next();
  };
}

module.exports = validateJoi;
