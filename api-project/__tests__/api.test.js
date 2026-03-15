/**
 * Automated API tests (Phase 3): status codes, affordability index, regions CRUD.
 * Uses Supertest against the exported Express app; no real server port.
 * Requires Postgres (same as dev) and API_KEY in .env for CRUD tests.
 */
const request = require('supertest');
const app = require('../app');
const pool = require('../config/db');

const apiKey = process.env.API_KEY;

afterAll(async () => {
  await pool.end();
});

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
      if (!apiKey) {
        console.warn('API_KEY not set; skipping CRUD-with-key tests');
        return;
      }
      const res = await request(app)
        .post('/api/regions')
        .send({ name: 'Test Region XYZ', gss_code: 'T99999999' })
        .set('Content-Type', 'application/json')
        .set('x-api-key', apiKey);
      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.name).toBe('Test Region XYZ');
      expect(res.body.gss_code).toBe('T99999999');
      createdRegionId = res.body.id;
    });

    it('PUT /api/regions/:id with API key returns 200 and updates region', async () => {
      if (!apiKey || !createdRegionId) return;
      const res = await request(app)
        .put(`/api/regions/${createdRegionId}`)
        .send({ name: 'Test Region Updated' })
        .set('Content-Type', 'application/json')
        .set('x-api-key', apiKey);
      expect(res.status).toBe(200);
      expect(res.body.name).toBe('Test Region Updated');
    });

    it('DELETE /api/regions/:id with API key returns 204', async () => {
      if (!apiKey || !createdRegionId) return;
      const res = await request(app)
        .delete(`/api/regions/${createdRegionId}`)
        .set('x-api-key', apiKey);
      expect(res.status).toBe(204);
      createdRegionId = null;
    });
  });
});
