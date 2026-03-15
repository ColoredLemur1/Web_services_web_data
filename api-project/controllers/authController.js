/**
 * Auth: register, login, create API key. No sessions.
 * Register → redirect to login. Login → verify; show API key in HTML (generate if first time).
 * POST /auth/api-key with email+password → verify, generate new key, show in HTML.
 */

const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const pool = require('../config/db');

const SALT_ROUNDS = 10;
const KEY_PREFIX = 'uk_live_';
const KEY_BYTES = 24;

function hashKey(rawKey) {
  return crypto.createHash('sha256').update(rawKey, 'utf8').digest('hex');
}

function generateApiKey() {
  const random = crypto.randomBytes(KEY_BYTES).toString('hex');
  return KEY_PREFIX + random;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

function renderKeyPage(apiKeyBlock) {
  const viewsDir = path.resolve(__dirname, '../views');
  let html = fs.readFileSync(path.join(viewsDir, 'api-key-result.html'), 'utf8');
  html = html.replace(/\{\{API_KEY_BLOCK\}\}/, apiKeyBlock);
  return html;
}

/**
 * POST /auth/register - body: { email, password }
 * Creates user, redirects to /login?registered=1 (no session).
 */
async function register(req, res, next) {
  const { email, password } = req.body;
  const password_hash = await bcrypt.hash(password, SALT_ROUNDS);
  try {
    await pool.query(
      'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email',
      [email, password_hash]
    );
  } catch (err) {
    if (err.code === '23505') {
      return res.redirect(302, '/register.html?error=exists');
    }
    return next(err);
  }
  res.redirect(302, '/login?registered=1');
}

/**
 * POST /auth/login - body: { email, password }
 * Verifies credentials. If no API key for user: generate one and show in HTML.
 * If user already has a key: show HTML with form to regenerate (POST /auth/api-key with email+password).
 */
async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const result = await pool.query('SELECT id, email, password_hash FROM users WHERE email = $1', [email.trim().toLowerCase()]);
    const user = result.rows[0];
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.redirect(302, '/login?error=invalid');
    }

    const keyRow = (await pool.query('SELECT id FROM api_keys WHERE user_id = $1', [user.id])).rows[0];
    if (!keyRow) {
      const rawKey = generateApiKey();
      const keyHash = hashKey(rawKey);
      await pool.query('INSERT INTO api_keys (user_id, key_hash) VALUES ($1, $2)', [user.id, keyHash]);
      const block = '<p>Copy your API key and use it in your code when calling the API (e.g. <code>X-API-Key</code> header).</p><pre id="apikey">' + escapeHtml(rawKey) + '</pre><button type="button" onclick="navigator.clipboard.writeText(document.getElementById(\'apikey\').textContent)">Copy</button>';
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.send(renderKeyPage(block));
    }

    const block = '<p>You already have an API key. If you lost it, generate a new one below (your old key will stop working).</p><form method="post" action="/auth/api-key"><label>Email</label><input type="email" name="email" required value="' + escapeHtml(user.email) + '"><label>Password</label><input type="password" name="password" required><button type="submit">Generate new API key</button></form>';
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.send(renderKeyPage(block));
  } catch (err) {
    next(err);
  }
}

/**
 * POST /auth/api-key - body: { email, password }
 * Verifies credentials, deletes existing key, creates new one, returns HTML with new key.
 */
async function createApiKey(req, res, next) {
  try {
    const { email, password } = req.body;
    const result = await pool.query('SELECT id, email, password_hash FROM users WHERE email = $1', [email.trim().toLowerCase()]);
    const user = result.rows[0];
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.redirect(302, '/login?error=invalid');
    }

    const rawKey = generateApiKey();
    const keyHash = hashKey(rawKey);
    await pool.query('DELETE FROM api_keys WHERE user_id = $1', [user.id]);
    await pool.query('INSERT INTO api_keys (user_id, key_hash) VALUES ($1, $2)', [user.id, keyHash]);

    const block = '<p>Your new API key (copy it now; it won\'t be shown again):</p><pre id="apikey">' + escapeHtml(rawKey) + '</pre><button type="button" onclick="navigator.clipboard.writeText(document.getElementById(\'apikey\').textContent)">Copy</button>';
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.send(renderKeyPage(block));
  } catch (err) {
    next(err);
  }
}

module.exports = {
  register,
  login,
  createApiKey,
};
