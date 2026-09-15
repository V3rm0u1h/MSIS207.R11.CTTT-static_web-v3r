const request = require('supertest');
const app = require('../src/app');

describe('Hello World API Endpoints', () => {
  
  test('GET /api/v1/hello - should return 200 and Hello World message', async () => {
    const res = await request(app).get('/api/v1/hello');
    expect(res.statusCode).toEqual(200);
    expect(res.headers['content-type']).toMatch(/json/);
    expect(res.body).toHaveProperty('message', 'Hello, World!');
  });

  test('GET /api/v1/health - should return 200 and status ok', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('status', 'ok');
  });

  test('GET /api/v1/unknown - should return 404 for non-existent routes', async () => {
    const res = await request(app).get('/api/v1/unknown');
    expect(res.statusCode).toEqual(404);
    expect(res.body).toHaveProperty('error', 'Route not found');
  });

});