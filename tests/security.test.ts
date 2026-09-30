import express from 'express';
import request from 'supertest';
import { createRateLimiter, parseTrustProxy, RATE_LIMIT_MESSAGE, securityHeaders } from '../src/security';

describe('securityHeaders', () => {
  const app = express();
  app.use(securityHeaders);
  app.get('/ping', (_req, res) => res.json({ ok: true }));

  it('sets the helmet security headers and hides X-Powered-By', async () => {
    const res = await request(app).get('/ping');

    expect(res.status).toBe(200);
    expect(res.headers['x-powered-by']).toBeUndefined();
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['content-security-policy']).toContain("default-src 'self'");
    expect(res.headers['content-security-policy']).not.toContain('upgrade-insecure-requests');
    expect(res.headers['cross-origin-resource-policy']).toBe('same-origin');
    expect(res.headers['x-frame-options']).toBe('SAMEORIGIN');
    expect(res.headers['strict-transport-security']).toBeDefined();
  });
});

describe('createRateLimiter', () => {
  const appWith = (limiter: express.RequestHandler) => {
    const app = express();
    app.use(express.json());
    app.post('/login', limiter, (req, res) => (
      req.body?.password === 'good' ? res.json({ ok: true }) : res.status(401).json({ error: { message: 'Invalid credentials' } })
    ));
    return app;
  };

  it('answers 429 with Retry-After once the failed attempts of a key exceed the limit', async () => {
    const app = appWith(createRateLimiter({ limit: 2, windowMs: 60_000, keyOf: (req) => String(req.body?.email ?? '') }));

    expect((await request(app).post('/login').send({ email: 'a@x.fr' })).status).toBe(401);
    expect((await request(app).post('/login').send({ email: 'A@x.fr' })).status).toBe(401);
    const blocked = await request(app).post('/login').send({ email: 'a@x.fr', password: 'good' });

    expect(blocked.status).toBe(429);
    expect(blocked.body).toEqual({ error: { message: RATE_LIMIT_MESSAGE } });
    expect(blocked.headers['retry-after']).toBeDefined();
    expect((await request(app).post('/login').send({ email: 'b@x.fr' })).status).toBe(401);
  });

  it('does not count successful requests by default', async () => {
    const app = appWith(createRateLimiter({ limit: 1, windowMs: 60_000 }));

    for (let attempt = 0; attempt < 3; attempt += 1) {
      expect((await request(app).post('/login').send({ password: 'good' })).status).toBe(200);
    }
  });

  it('never limits when disabled', async () => {
    const app = appWith(createRateLimiter({ limit: 1, windowMs: 60_000, enabled: false }));

    for (let attempt = 0; attempt < 3; attempt += 1) {
      expect((await request(app).post('/login').send({})).status).toBe(401);
    }
  });
});

describe('parseTrustProxy', () => {
  it.each([
    [undefined, false],
    ['false', false],
    ['true', true],
    ['1', 1],
    ['loopback, 10.0.0.0/8', 'loopback, 10.0.0.0/8'],
  ])('parses %p as %p', (value, expected) => {
    expect(parseTrustProxy(value)).toBe(expected);
  });
});
