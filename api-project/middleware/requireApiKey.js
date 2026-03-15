const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const { createError } = require('./errorHandler');

const PROTECTED_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'];

/**
 * Security middleware: require a valid API key for POST, PUT, PATCH, and DELETE.
 * GET and other read-only methods are allowed without a key.
 * Key can be sent via header X-API-Key or Authorization: Bearer <key>.
 */
function requireApiKey(req, res, next) {
  if (!PROTECTED_METHODS.includes(req.method)) {
    return next();
  }

  const expectedKey = process.env.API_KEY;
  if (!expectedKey) {
    return next(createError(401, 'Server is not configured with API_KEY. Set API_KEY in .env to enable write operations.'));
  }

  const apiKey = req.headers['x-api-key'] || (() => {
    const auth = req.headers.authorization;
    if (auth && auth.startsWith('Bearer ')) return auth.slice(7);
    return null;
  })();

  if (!apiKey || apiKey !== expectedKey) {
    return next(createError(401, 'Invalid or missing API key. Use X-API-Key header or Authorization: Bearer <key>.'));
  }

  next();
}

module.exports = requireApiKey;
