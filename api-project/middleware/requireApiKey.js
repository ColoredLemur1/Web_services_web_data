const crypto = require('crypto');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const pool = require('../config/db');
const { createError } = require('./errorHandler');

const PROTECTED_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'];

function hashKey(rawKey) {
  return crypto.createHash('sha256').update(rawKey, 'utf8').digest('hex');
}

/**
 * Require a valid API key for POST, PUT, PATCH, DELETE.
 * Key can be: (1) process.env.API_KEY (legacy), or (2) a key from api_keys table (hash lookup).
 * Header: X-API-Key or Authorization: Bearer <key>.
 */
async function requireApiKey(req, res, next) {
  if (!PROTECTED_METHODS.includes(req.method)) {
    return next();
  }

  const apiKey = req.headers['x-api-key'] || (() => {
    const auth = req.headers.authorization;
    if (auth && auth.startsWith('Bearer ')) return auth.slice(7);
    return null;
  })();

  if (!apiKey) {
    return next(createError(401, 'Invalid or missing API key. Use X-API-Key header or Authorization: Bearer <key>.'));
  }

  const envKey = process.env.API_KEY;
  if (envKey && envKey.trim() && apiKey === envKey.trim()) {
    return next();
  }

  try {
    const keyHash = hashKey(apiKey);
    const result = await pool.query('SELECT user_id FROM api_keys WHERE key_hash = $1', [keyHash]);
    if (result.rows[0]) {
      req.apiKeyUserId = result.rows[0].user_id;
      return next();
    }
  } catch (err) {
    return next(err);
  }

  return next(createError(401, 'Invalid or missing API key. Use X-API-Key header or Authorization: Bearer <key>.'));
}

module.exports = requireApiKey;
