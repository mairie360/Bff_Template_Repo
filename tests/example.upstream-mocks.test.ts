import path from 'node:path';
import request from 'supertest';
import app from '../src/app';
import { ContractMockServer, unreachableUrl, type MockReply } from './support/contract-mock-server';
import { bearer, coreApiUrls, meResponse, profileOf } from './support/core-fixtures';
import { OpenApiContract } from './support/openapi-contract';
import { loadOrvalContract } from './support/orval-contract';

// The whole app is tested with the real axios client against a real HTTP server mocking Core API. Its
// contract is rebuilt from the installed @mairie360/core-api-openapi package (version pinned in
// package.json): the mock rejects routes, parameters and bodies absent from the contract and validates
// its success answers. Errors are not typed by orval: every mocked error reply is marked
// `outOfContract`. Every BFF answer is validated against contracts/openapi.json.

const coreApi = new ContractMockServer('CORE_API', loadOrvalContract('@mairie360/core-api-openapi'));
// Templates of the Core API contract (mock keys); the expected concrete paths come from coreApiUrls.
const CORE = { me: '/api/v1/user/me/', health: '/health' } as const;
const bffContract = OpenApiContract.load(path.join(__dirname, '..', 'contracts', 'openapi.json'));

beforeAll(async () => { await coreApi.start(); });
afterAll(async () => { await coreApi.stop(); });
beforeEach(() => {
  coreApi.reset();
  // baseUrl() reads CORE_API_URL and CORE_API_PORT on every request: no module reload needed.
  const url = new URL(coreApi.url);
  process.env.CORE_API_URL = url.hostname;
  process.env.CORE_API_PORT = url.port;
});
afterEach(() => {
  expect(coreApi.violations).toEqual([]);
});

function expectBffContract(method: string, pathname: string, response: request.Response) {
  const match = bffContract.match(method, pathname);
  expect(match?.template).toBeDefined();
  const { documented, schema } = bffContract.responseSchema(match!, response.status);
  expect({ status: response.status, documented }).toEqual({ status: response.status, documented: true });
  if (schema && response.type === 'application/json') expect(bffContract.validate(schema, response.body)).toEqual([]);
}

/** Core API error: not typed by orval, hence out of contract. Core answers plain text (actix ResponseError). */
const coreError = (status: number, raw = 'An error occurred while accessing the database.'): MockReply =>
  ({ status, raw, contentType: 'text/plain; charset=utf-8', outOfContract: true });

async function withUnreachableCore() {
  const url = new URL(await unreachableUrl());
  process.env.CORE_API_URL = url.hostname;
  process.env.CORE_API_PORT = url.port;
}

const profile = (authorization?: string) => {
  const call = request(app).get('/example/profile');
  return authorization ? call.set('Authorization', authorization) : call;
};

describe('GET /example/profile with a contract-driven Core API mock', () => {
  test('forwards the caller session to GET /api/v1/user/me/ and only exposes the profile fields', async () => {
    const me = meResponse();
    coreApi.on('get', CORE.me, { body: me });

    const response = await profile(bearer('session-42'));

    expect(response.status).toBe(200);
    expectBffContract('get', '/example/profile', response);
    expect(response.headers['cache-control']).toBe('no-store');
    expect(response.body).toEqual(profileOf(me));
    expect(coreApi.requests.map((call) => `${call.method} ${call.url.pathname}`)).toEqual([`GET ${coreApiUrls.getGetMeUrl()}`]);
    expect(coreApi.requests[0].headers.authorization).toBe(bearer('session-42'));
    expect(coreApi.requests[0].headers.accept).toBe('application/json');
  });

  test.each([
    ['no Authorization header', undefined],
    ['a non-Bearer scheme', 'Basic YW5uZTpzZWNyZXQ='],
    ['an empty Bearer token', 'Bearer '],
  ])('answers 401 without calling Core for %s', async (_label, authorization) => {
    const response = await profile(authorization);

    expect(response.status).toBe(401);
    expectBffContract('get', '/example/profile', response);
    expect(response.body).toEqual({ error: { message: 'Invalid session.' } });
    expect(coreApi.requests).toHaveLength(0);
  });

  test.each([401, 404])('keeps a Core %i', async (status) => {
    coreApi.on('get', CORE.me, coreError(status, 'Unauthorized'));

    const response = await profile(bearer());

    expect(response.status).toBe(status);
    expectBffContract('get', '/example/profile', response);
    expect(response.body).toEqual({ error: { message: `The CORE_API service answered ${status}.` } });
  });

  test('turns a Core 500 into a 502 without relaying its body', async () => {
    coreApi.on('get', CORE.me, coreError(500));

    const response = await profile(bearer());

    expect(response.status).toBe(502);
    expectBffContract('get', '/example/profile', response);
    expect(JSON.stringify(response.body)).not.toContain('database');
  });

  test('answers 502 when Core answers a body without the profile fields', async () => {
    coreApi.on('get', CORE.me, { body: { email: 'anne@mairie.test' }, outOfContract: true });

    const response = await profile(bearer());

    expect(response.status).toBe(502);
    expectBffContract('get', '/example/profile', response);
    expect(response.body).toEqual({ error: { message: 'The CORE_API answer is invalid.' } });
  });

  test('answers 502 when Core API is unreachable', async () => {
    await withUnreachableCore();

    const response = await profile(bearer());

    expect(response.status).toBe(502);
    expectBffContract('get', '/example/profile', response);
    expect(response.body).toEqual({ error: { message: 'The CORE_API service is unavailable.' } });
  });

  test('answers 503 when Core API is not configured', async () => {
    delete process.env.CORE_API_URL;

    const response = await profile(bearer());

    expect(response.status).toBe(503);
    expectBffContract('get', '/example/profile', response);
    expect(response.body).toEqual({ error: { message: 'The CORE_API service is not configured.' } });
  });
});

describe('GET /check_apis', () => {
  test('answers 200 when Core API is healthy', async () => {
    coreApi.on('get', CORE.health, { status: 200 });

    const response = await request(app).get('/check_apis');

    expect(response.status).toBe(200);
    expectBffContract('get', '/check_apis', response);
    expect(response.body).toEqual({ status: 'OK', core_api: 'Connected' });
    expect(coreApi.requests[0].headers.authorization).toBeUndefined();
  });

  test('answers 502 when Core API is unreachable', async () => {
    await withUnreachableCore();

    const response = await request(app).get('/check_apis');

    expect(response.status).toBe(502);
    expectBffContract('get', '/check_apis', response);
    expect(response.body).toEqual({ status: 'Error', core_api: 'Unreachable' });
  });
});
