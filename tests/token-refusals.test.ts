import { readFileSync } from 'node:fs';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { join } from 'node:path';
import request from 'supertest';
import app from '../src/app';
import { eddsaToken, foreignKeyPair, hs256Token, useSessionPublicKey } from './support/session-keys';

// MAIR-538: token refusals on every secured operation of the published contract. An operation is covered as soon
// as it is documented, so a BFF generated from this template starts with the suite and a new route cannot ship
// without it. Each forged token must get its 401 from the BFF itself, before any upstream call; a genuine token
// (positive control) must get past that check, so the 401s come from the token alone.

type Operation = { security?: unknown[] };
type Method = 'get' | 'post' | 'put' | 'patch' | 'delete';
const contract = JSON.parse(readFileSync(join(__dirname, '..', 'contracts', 'openapi.json'), 'utf8')) as {
  security: unknown[];
  paths: Record<string, Record<string, Operation>>;
};

// Public on purpose: the probes.
const PUBLIC_OPERATIONS = ['GET /health', 'GET /check_apis'];

const operations = Object.entries(contract.paths).flatMap(([path, methods]) =>
  Object.entries(methods).map(([method, operation]) => ({
    method: method as Method,
    label: `${method.toUpperCase()} ${path}`,
    uri: path.replace(/\{[^}]+\}/g, '7'),
    secured: (operation.security ?? contract.security).length > 0,
  })));
const secured = operations.filter((operation) => operation.secured);

const base64url = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url');
const genuine = eddsaToken(1);
const [genuineHeader, genuinePayload, genuineSignature] = genuine.split('.');
const forgedHeaders: Array<[string, string]> = [
  ['another scheme', `Basic ${genuine}`],
  ['a token without scheme', genuine],
  ['an empty bearer', 'Bearer '],
  ['garbage', 'Bearer not.a.jwt'],
  ['an HS256 token signed with a shared secret', `Bearer ${hs256Token(1, 'not-the-secret-of-this-deployment-0123')}`],
  ['an EdDSA token signed with another key under Core\'s kid', `Bearer ${eddsaToken(1, { privateKey: foreignKeyPair.privateKey })}`],
  ['an EdDSA token without audience', `Bearer ${eddsaToken(1, { claims: { aud: undefined } })}`],
  ['an expired token', `Bearer ${eddsaToken(1, { expiresIn: -60 })}`],
  ['alg none', `Bearer ${base64url({ alg: 'none', typ: 'JWT' })}.${base64url({ sub: '1', exp: 4_102_444_800 })}.`],
  ['a payload swapped under a valid signature', `Bearer ${genuineHeader}.${base64url({ sub: '2', exp: 4_102_444_800 })}.${genuineSignature}`],
  ['an asymmetric algorithm', `Bearer ${base64url({ alg: 'RS256', typ: 'JWT' })}.${genuinePayload}.${genuineSignature}`],
  ['a well-signed token with a non-numeric subject', `Bearer ${eddsaToken('admin')}`],
];

// Stands for every upstream: counts the calls and fails them all, so a genuine token ends in a 502, never a 401.
let upstreamCalls = 0;
let upstream: Server;

beforeAll(async () => {
  upstream = createServer((_req, res) => {
    upstreamCalls += 1;
    res.writeHead(500).end();
  });
  await new Promise<void>((resolve) => upstream.listen(0, '127.0.0.1', resolve));
  process.env.CORE_API_URL = `http://127.0.0.1:${(upstream.address() as AddressInfo).port}`;
  delete process.env.CORE_API_PORT;
  useSessionPublicKey();
});

afterAll(async () => {
  await new Promise((resolve) => upstream.close(resolve));
});

beforeEach(() => {
  upstreamCalls = 0;
  jest.spyOn(process.stdout, 'write').mockImplementation(() => true);
  jest.spyOn(process.stderr, 'write').mockImplementation(() => true);
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('token refusals of the contract operations', () => {
  it('only leaves the pinned operations public', () => {
    expect(operations.filter((operation) => !operation.secured).map((operation) => operation.label).sort())
      .toEqual([...PUBLIC_OPERATIONS].sort());
    expect(secured.length).toBeGreaterThan(0);
  });

  it.each(secured.map((operation) => [operation.label, operation] as const))(
    '%s refuses a missing or forged token with 401, without calling an upstream',
    async (_label, { method, uri }) => {
      for (const [name, authorization] of [['no token', undefined] as const, ...forgedHeaders]) {
        const call = request(app)[method](uri).send({});
        const response = await (authorization === undefined ? call : call.set('Authorization', authorization));

        expect({ name, status: response.status }).toEqual({ name, status: 401 });
        expect(response.body).toEqual({ error: { code: 'UNAUTHORIZED', message: expect.any(String), details: [] } });
      }
      expect(upstreamCalls).toBe(0);
    },
  );

  it.each(secured.map((operation) => [operation.label, operation] as const))(
    '%s lets a genuine token through the session check (control)',
    async (_label, { method, uri }) => {
      const response = await request(app)[method](uri).set('Authorization', `Bearer ${genuine}`).send({});

      // The genuine token passes the session check and reaches the (failing) upstream: 502, never 401.
      expect(response.status).toBe(502);
      expect(upstreamCalls).toBeGreaterThan(0);
    },
  );
});
