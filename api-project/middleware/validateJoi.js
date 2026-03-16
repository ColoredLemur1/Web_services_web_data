/**
 * Validates request body, query or params with a Joi schema. On failure returns 400. On success assigns validated value and calls next.
 */

const { createError } = require('./errorHandler');

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
