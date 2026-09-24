/**
 * HTTP-level smoke tests that drive the real Express app with supertest.
 *
 * These deliberately exercise only paths that do NOT touch the database, so the
 * suite is deterministic and needs no seeded data or live connection:
 *  - health/info endpoints
 *  - the 404 handler
 *  - auth middleware rejecting requests with no/invalid token
 *  - request-validation short-circuits that run before any DB call
 *
 * They lock in the app's wiring (routes mounted, middleware order, auth guards)
 * — the class of regression that unit tests on helpers can't catch.
 */

import request from 'supertest';
import { app } from '../src/index';

describe('API smoke tests', () => {
  describe('public/health endpoints', () => {
    it('GET /health returns ok', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
    });

    it('GET /api returns the API descriptor', async () => {
      const res = await request(app).get('/api');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('endpoints');
    });

    it('unknown routes hit the 404 handler with a JSON body', async () => {
      const res = await request(app).get('/api/does-not-exist');
      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Not Found');
    });
  });

  describe('authentication guards', () => {
    it('rejects a protected route with no token (401)', async () => {
      const res = await request(app).get('/api/vendor/profile');
      expect(res.status).toBe(401);
      expect(res.body.error).toMatch(/token/i);
    });

    it('rejects a protected route with a malformed token (401)', async () => {
      const res = await request(app)
        .get('/api/vendor/profile')
        .set('Authorization', 'Bearer not-a-real-jwt');
      expect(res.status).toBe(401);
    });

    it('rejects an admin route with no token (401)', async () => {
      const res = await request(app).get('/api/admin/users');
      expect(res.status).toBe(401);
    });
  });

  describe('request validation short-circuits', () => {
    it('POST /api/auth/login with no body returns 400 before any DB lookup', async () => {
      const res = await request(app).post('/api/auth/login').send({});
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/required/i);
    });
  });
});
