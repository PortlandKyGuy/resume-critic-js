const request = require('supertest');
const { createApp } = require('../../src/app');

describe('App Integration Tests', () => {
  let app;

  beforeAll(() => {
    process.env.USE_MOCK_LLM = 'true';
    app = createApp();
  });

  describe('Health endpoints', () => {
    it('should return healthy status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toMatchObject({
        status: 'healthy',
        timestamp: expect.any(String),
        version: expect.any(String),
        environment: expect.any(String)
      });
    });

    it('should return ready status', async () => {
      const response = await request(app)
        .get('/ready')
        .expect(200);

      expect(response.body).toMatchObject({
        status: 'ready',
        checks: expect.any(Object)
      });
    });
  });

  describe('API versioning', () => {
    it('should return v1 endpoints', async () => {
      const response = await request(app)
        .get('/v1')
        .expect(200);

      expect(response.body.version).toBe('v1');
      expect(response.body.endpoints).toBeDefined();
    });

    it('should return v2 endpoints', async () => {
      const response = await request(app)
        .get('/v2')
        .expect(200);

      expect(response.body.version).toBe('v2');
      expect(response.body.description).toBeDefined();
    });
  });

  describe('Error handling', () => {
    it('should return 404 for unknown routes', async () => {
      const response = await request(app)
        .get('/unknown')
        .expect(404);

      expect(response.body.error).toMatchObject({
        code: 'NOT_FOUND',
        message: expect.any(String),
        statusCode: 404
      });
    });
  });
});