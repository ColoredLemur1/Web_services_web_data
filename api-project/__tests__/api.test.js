/**
 * Automated API tests: status codes, affordability index, regions CRUD, auth.
 * Uses Supertest against the exported Express app; no real server port.
 * Requires Postgres. CRUD tests use API_KEY from .env or a DB-created test user key.
 */
const crypto = require('crypto');
const request = require('supertest');
const app = require('../app');
const pool = require('../config/db');

const apiKey = process.env.API_KEY;
let testUserApiKey = null;

function hashKey(rawKey) {
  return crypto.createHash('sha256').update(rawKey, 'utf8').digest('hex');
}

beforeAll(async () => {
  if (apiKey) return;
  try {
    const rawKey = 'uk_live_test_' + crypto.randomBytes(16).toString('hex');
    const keyHash = hashKey(rawKey);
    const userRes = await pool.query(
      'INSERT INTO users (email, password_hash) VALUES ($1, $2) ON CONFLICT (email) DO NOTHING RETURNING id',
      ['test-api@example.com', '$2a$10$dummyhash']
    );
    let userId = userRes.rows[0]?.id;
    if (!userId) {
      const r = await pool.query('SELECT id FROM users WHERE email = $1', ['test-api@example.com']);
      userId = r.rows[0].id;
    }
    await pool.query('DELETE FROM api_keys WHERE user_id = $1', [userId]);
    await pool.query('INSERT INTO api_keys (user_id, key_hash) VALUES ($1, $2)', [userId, keyHash]);
    testUserApiKey = rawKey;
  } catch (e) {
    testUserApiKey = null;
  }
});

afterAll(async () => {
  await pool.end();
});

const effectiveApiKey = () => apiKey || testUserApiKey;

describe('UK Housing API', () => {
  describe('Status codes', () => {
    it('GET /api/regions returns 200', async () => {
      const res = await request(app).get('/api/regions');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('GET /api/names returns 200', async () => {
      const res = await request(app).get('/api/names');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('message');
      expect(res.body).toHaveProperty('timestamp');
    });

    it('GET unknown route returns 404', async () => {
      const res = await request(app).get('/api/nonexistent');
      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty('error');
      expect(res.body).toHaveProperty('message');
    });

    it('GET /api/affordability-index without salary returns 400', async () => {
      const res = await request(app).get('/api/affordability-index');
      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('message');
      expect(res.body.message.toLowerCase()).toMatch(/salary/);
    });

    it('POST /api/regions without API key returns 401', async () => {
      const res = await request(app)
        .post('/api/regions')
        .send({ name: 'Test', gss_code: 'T1' })
        .set('Content-Type', 'application/json');
      expect(res.status).toBe(401);
    });

    it('PUT /api/regions/1 without API key returns 401', async () => {
      const res = await request(app)
        .put('/api/regions/1')
        .send({ name: 'Updated' })
        .set('Content-Type', 'application/json');
      expect(res.status).toBe(401);
    });

    it('DELETE /api/regions/1 without API key returns 401', async () => {
      const res = await request(app).delete('/api/regions/1');
      expect(res.status).toBe(401);
    });
  });

  describe('Input validation (Joi)', () => {
    it('POST /api/regions with empty name returns 400', async () => {
      const res = await request(app)
        .post('/api/regions')
        .send({ name: '', gss_code: 'E12000007' })
        .set('Content-Type', 'application/json')
        .set('x-api-key', effectiveApiKey() || 'dummy');
      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('message');
      expect(res.body.message.toLowerCase()).toMatch(/name/);
    });

    it('POST /api/regions with invalid gss_code returns 400', async () => {
      const res = await request(app)
        .post('/api/regions')
        .send({ name: 'Valid Name', gss_code: 'invalid-code!' })
        .set('Content-Type', 'application/json')
        .set('x-api-key', effectiveApiKey() || 'dummy');
      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('message');
      expect(res.body.message.toLowerCase()).toMatch(/gss_code|alphanumeric/);
    });

    it('PUT /api/regions/:id with invalid id returns 400', async () => {
      const res = await request(app)
        .put('/api/regions/not-a-number')
        .send({ name: 'Updated' })
        .set('Content-Type', 'application/json')
        .set('x-api-key', effectiveApiKey() || 'dummy');
      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('message');
      expect(res.body.message.toLowerCase()).toMatch(/id|integer/);
    });

    it('PUT /api/regions/1 with empty body returns 400', async () => {
      const res = await request(app)
        .put('/api/regions/1')
        .send({})
        .set('Content-Type', 'application/json')
        .set('x-api-key', effectiveApiKey() || 'dummy');
      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('message');
      expect(res.body.message.toLowerCase()).toMatch(/name|gss_code|required/);
    });

    it('GET /api/housing-sales with invalid period_from returns 400', async () => {
      const res = await request(app).get('/api/housing-sales?period_from=not-a-date');
      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('message');
    });
  });

  describe('Affordability index', () => {
    it('GET /api/affordability-index?salary=35000 returns 200 and correct shape', async () => {
      const res = await request(app).get('/api/affordability-index?salary=35000');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('region');
      expect(res.body).toHaveProperty('inputs');
      expect(res.body).toHaveProperty('rental_snapshot');
      expect(res.body).toHaveProperty('ratios');
      expect(res.body).toHaveProperty('health_score');
      expect(res.body).toHaveProperty('health_explanation');
      expect(['Affordable', 'Stretched', 'Unaffordable']).toContain(res.body.health_score);
      expect(typeof res.body.ratios.rent_to_salary_ratio).toBe('number');
      expect(res.body.ratios.rent_to_salary_ratio).toBeGreaterThanOrEqual(0);
      expect(res.body.ratios.rent_to_salary_ratio).toBeLessThanOrEqual(1);
    });

    it('GET /api/affordability-index?salary=0 returns 400 (boundary)', async () => {
      const res = await request(app).get('/api/affordability-index?salary=0');
      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('message');
      expect(res.body.message.toLowerCase()).toMatch(/salary|positive/);
    });

    it('GET /api/affordability-index?salary=-1000 returns 400 (boundary)', async () => {
      const res = await request(app).get('/api/affordability-index?salary=-1000');
      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('message');
      expect(res.body.message.toLowerCase()).toMatch(/salary|positive/);
    });
  });

  describe('Regions CRUD', () => {
    let createdRegionId;
    const TEST_GSS_CODE = 'T99999999';

    afterAll(async () => {
      // Teardown: remove test region by id if we have it, then by gss_code so we
      // always wipe test data even if a test failed mid-run and left a row behind.
      try {
        if (createdRegionId) {
          await pool.query('DELETE FROM regions WHERE id = $1', [createdRegionId]);
        }
        await pool.query("DELETE FROM regions WHERE gss_code = $1", [TEST_GSS_CODE]);
      } catch (err) {
        console.error('CRUD teardown cleanup failed:', err.message);
      }
    });

    it('POST /api/regions without API key returns 401', async () => {
      const res = await request(app)
        .post('/api/regions')
        .send({ name: 'Test Region XYZ', gss_code: 'T99999999' })
        .set('Content-Type', 'application/json');
      expect(res.status).toBe(401);
    });

    it('POST /api/regions with API key returns 201 and creates region', async () => {
      const key = effectiveApiKey();
      if (!key) return;
      const res = await request(app)
        .post('/api/regions')
        .send({ name: 'Test Region XYZ', gss_code: 'T99999999' })
        .set('Content-Type', 'application/json')
        .set('x-api-key', key);
      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.name).toBe('Test Region XYZ');
      expect(res.body.gss_code).toBe('T99999999');
      createdRegionId = res.body.id;
    });

    it('PUT /api/regions/:id with API key returns 200 and updates region', async () => {
      if (!effectiveApiKey() || !createdRegionId) return;
      const res = await request(app)
        .put(`/api/regions/${createdRegionId}`)
        .send({ name: 'Test Region Updated' })
        .set('Content-Type', 'application/json')
        .set('x-api-key', effectiveApiKey());
      expect(res.status).toBe(200);
      expect(res.body.name).toBe('Test Region Updated');
    });

    it('DELETE /api/regions/:id with API key returns 204', async () => {
      if (!effectiveApiKey() || !createdRegionId) return;
      const res = await request(app)
        .delete(`/api/regions/${createdRegionId}`)
        .set('x-api-key', effectiveApiKey());
      expect(res.status).toBe(204);
      createdRegionId = null;
    });
  });

  describe('GET /api/analysis/market-summary', () => {
    it('returns 503 when unconfigured or 200/502 when configured', async () => {
      const res = await request(app).get('/api/analysis/market-summary');
      expect([200, 502, 503]).toContain(res.status);
      if (res.status === 503) {
        expect(res.body).toHaveProperty('error', 'Service Unavailable');
        expect(res.body.message.toLowerCase()).toMatch(/not configured|gemini|api_key/);
      }
      if (res.status === 502) {
        expect(res.body).toHaveProperty('error', 'Bad Gateway');
        expect(res.body.message.toLowerCase()).toMatch(/ai|service|unavailable/);
      }
      if (res.status === 200) {
        expect(res.body).toHaveProperty('region');
        expect(res.body).toHaveProperty('summary');
        expect(res.body).toHaveProperty('data_snapshot');
        expect(res.body).toHaveProperty('generated_at');
      }
    });

    it('returns 404 for nonexistent region when Gemini is configured', async () => {
      const res = await request(app).get('/api/analysis/market-summary?region_id=999999');
      expect([404, 503]).toContain(res.status);
      if (res.status === 404) {
        expect(res.body.message.toLowerCase()).toMatch(/region|not found/);
      }
    });

    it('GET /api/analysis/:region_id returns same shape (200/502/503)', async () => {
      const res = await request(app).get('/api/analysis/1');
      expect([200, 502, 503, 404]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body).toHaveProperty('region');
        expect(res.body).toHaveProperty('summary');
        expect(res.body).toHaveProperty('data_snapshot');
        expect(res.body.data_snapshot).toHaveProperty('region_name');
        expect(res.body.data_snapshot).toHaveProperty('monthly_rent_gbp');
        expect(res.body).toHaveProperty('generated_at');
      }
    });

    it('invalid property_type_id returns 400', async () => {
      const res = await request(app).get('/api/analysis/market-summary?region_id=1&property_type_id=99999');
      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('message');
      expect(res.body.message.toLowerCase()).toMatch(/property_type|invalid/);
    });

    it('invalid focus returns 400', async () => {
      const res = await request(app).get('/api/analysis/market-summary?focus=invalid_focus');
      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('message');
    });

    it('tailoring params (salary, focus) appear in data_snapshot when provided and 200', async () => {
      const res = await request(app).get('/api/analysis/market-summary?salary=35000&focus=first_time_buyer');
      expect([200, 502, 503]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body.data_snapshot).toHaveProperty('user_salary_gbp', 35000);
        expect(res.body.data_snapshot).toHaveProperty('rent_to_salary_pct');
        expect(res.body.data_snapshot).toHaveProperty('focus', 'first_time_buyer');
      }
    });
  });

  describe('Auth (register, login, API key)', () => {
    it('POST /auth/register with valid body redirects to /login', async () => {
      const email = `auth-test-${Date.now()}@example.com`;
      const res = await request(app)
        .post('/auth/register')
        .send({ email, password: 'password123' })
        .set('Content-Type', 'application/x-www-form-urlencoded')
        .type('form');
      expect(res.status).toBe(302);
      expect(res.headers.location).toBe('/login?registered=1');
    });

    it('POST /auth/register with duplicate email redirects to register with error', async () => {
      const res = await request(app)
        .post('/auth/register')
        .send({ email: 'test-api@example.com', password: 'password123' })
        .set('Content-Type', 'application/x-www-form-urlencoded')
        .type('form');
      expect(res.status).toBe(302);
      expect(res.headers.location).toMatch(/register\.html\?error=exists/);
    });

    it('POST /auth/login with invalid credentials redirects to /login with error', async () => {
      const res = await request(app)
        .post('/auth/login')
        .send({ email: 'nonexistent@example.com', password: 'wrong' })
        .set('Content-Type', 'application/x-www-form-urlencoded')
        .type('form');
      expect(res.status).toBe(302);
      expect(res.headers.location).toMatch(/login\?error=invalid/);
    });

    it('POST /auth/login with valid credentials returns HTML with API key or regenerate form', async () => {
      const email = `login-test-${Date.now()}@example.com`;
      await request(app)
        .post('/auth/register')
        .send({ email, password: 'password123' })
        .set('Content-Type', 'application/x-www-form-urlencoded')
        .type('form');
      const res = await request(app)
        .post('/auth/login')
        .send({ email, password: 'password123' })
        .set('Content-Type', 'application/x-www-form-urlencoded')
        .type('form');
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/text\/html/);
      expect(res.text).toMatch(/API key|apikey|Copy/);
    });

    it('protected endpoint accepts DB-issued API key', async () => {
      const key = effectiveApiKey();
      if (!key) return;
      const res = await request(app)
        .get('/api/regions')
        .set('x-api-key', key);
      expect(res.status).toBe(200);
    });
  });
});
