import axios from 'axios';
import request from 'supertest';
import { readFileSync } from 'node:fs';
import app from '../src/app';

// Core API calls go through the generated client: the other behaviours of the BFF are checked
// against a real HTTP server driven by the contract (example.upstream-mocks.test.ts).
const requestSpy = jest.spyOn(axios.Axios.prototype, 'request');
beforeEach(() => { requestSpy.mockClear(); });
afterAll(() => { requestSpy.mockRestore(); });

test('runtime and exported routes/data have the same OpenAPI document', async () => {
  const expected = JSON.parse(readFileSync('contracts/openapi.json', 'utf8'));
  for (const path of ['/openapi.json', '/swagger.json']) {
    const result = await request(app).get(path);
    expect(result.status).toBe(200);
    expect(result.body).toEqual(expected);
  }
});

test('every operation requires bearerAuth unless it declares security: []', () => {
  const document = JSON.parse(readFileSync('contracts/openapi.json', 'utf8'));
  expect(document.security).toEqual([{ bearerAuth: [] }]);
  const publicOperations = Object.entries(document.paths as Record<string, Record<string, { security?: unknown[] }>>)
    .flatMap(([path, operations]) => Object.entries(operations)
      .filter(([, operation]) => operation.security?.length === 0)
      .map(([method]) => `${method.toUpperCase()} ${path}`));
  expect(publicOperations.sort()).toEqual(['GET /check_apis', 'GET /health']);
});

test('the example profile rejects a missing session before contacting upstream services', async () => {
  const result = await request(app).get('/example/profile');

  expect(result.status).toBe(401);
  expect(requestSpy).not.toHaveBeenCalled();
});

test('unknown routes and unparsable bodies answer JSON with the security headers', async () => {
  const unknown = await request(app).get('/unknown');
  expect(unknown.status).toBe(404);
  expect(unknown.body).toEqual({ error: { message: 'Unknown route.' } });
  expect(unknown.headers['content-security-policy']).toBe("default-src 'none'");
  expect(unknown.headers['x-content-type-options']).toBe('nosniff');
  expect(unknown.headers['x-powered-by']).toBeUndefined();

  const invalid = await request(app).post('/example/profile').set('Content-Type', 'application/json').send('{"broken"');
  expect(invalid.status).toBe(400);
  expect(invalid.body).toEqual({ error: { message: 'Invalid request body.' } });
});
