/**
 * Auth: register, login, create API key. No sessions. Register shows key page. Login shows key or regenerate form.
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

/** Creates user and API key, then shows key page. */
async function register(req, res, next) {
  const { email, password } = req.body;
  const password_hash = await bcrypt.hash(password, SALT_ROUNDS);
  let userId;
  let userEmail;
  try {
    const ins = await pool.query(
      'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email',
      [email.trim().toLowerCase(), password_hash]
    );
    userId = ins.rows[0].id;
    userEmail = ins.rows[0].email;
  } catch (err) {
    if (err.code === '23505') {
      return res.redirect(302, '/register.html?error=exists');
    }
    return next(err);
  }

  const rawKey = generateApiKey();
  const keyHash = hashKey(rawKey);
  try {
    await pool.query('INSERT INTO api_keys (user_id, key_hash) VALUES ($1, $2)', [userId, keyHash]);
  } catch (err) {
    return next(err);
  }

  const block = '<p>Copy your API key and use it in your code when calling the API (e.g. <code>X-API-Key</code> header).</p><pre id="apikey">' + escapeHtml(rawKey) + '</pre><button type="button" onclick="navigator.clipboard.writeText(document.getElementById(\'apikey\').textContent)">Copy</button>';
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  return res.send(renderKeyPage(block));
}

/** Verifies credentials. Generates and shows API key if first time; otherwise shows form to regenerate key. */
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

/** Verifies credentials, replaces existing key with a new one, returns HTML with new key. */
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
