import request from 'supertest';
import app from '../src/app';

// The headers come from @mairie360/bffs-lib (securityHeaders + apiOnlyHeaders), tested there; these
// tests check that the app mounts them where the template expects.
describe('security headers of the app', () => {
  it('sets the helmet headers and the strict API-only headers on API routes', async () => {
    const res = await request(app).get('/health');

    expect(res.status).toBe(200);
    expect(res.headers['x-powered-by']).toBeUndefined();
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['content-security-policy']).toBe("default-src 'none'");
    expect(res.headers['permissions-policy']).toBe('geolocation=(), camera=(), microphone=()');
    expect(res.headers['cross-origin-resource-policy']).toBe('same-origin');
    expect(res.headers['x-frame-options']).toBe('SAMEORIGIN');
    expect(res.headers['strict-transport-security']).toBeDefined();
  });

  it('keeps the helmet CSP (no default-src none) on /docs, which needs scripts and styles', async () => {
    const res = await request(app).get('/docs/');

    expect(res.status).toBe(200);
    expect(res.headers['content-security-policy']).toContain("default-src 'self'");
    expect(res.headers['content-security-policy']).not.toContain('upgrade-insecure-requests');
  });

  it('marks session-bound answers no-store, even the 401', async () => {
    const res = await request(app).get('/example/profile');

    expect(res.status).toBe(401);
    expect(res.headers['cache-control']).toBe('no-store');
  });
});
