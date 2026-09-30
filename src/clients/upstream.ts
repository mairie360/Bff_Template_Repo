import type { Request, Response } from 'express';

/** Error answered to the caller as is: `status` + `{ error: { message } }`. */
export class UpstreamError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

/** The caller's `Authorization: Bearer <token>` header, forwarded unchanged; 401 without one. */
export function authorization(req: Request): string {
  const header = req.headers.authorization;
  if (!header || !/^Bearer\s+\S+$/i.test(header)) throw new UpstreamError(401, 'Invalid session.');
  return header;
}

/**
 * Base URL of an upstream service from `<SERVICE>_URL` (scheme optional) and `<SERVICE>_PORT`
 * (used when the URL has no port). Read on every call, so tests and deployments can change it
 * without reloading the module.
 */
export function baseUrl(service: string): string {
  const configured = process.env[`${service}_URL`];
  if (!configured) throw new UpstreamError(503, `The ${service} service is not configured.`);
  const url = new URL(/^https?:\/\//i.test(configured) ? configured : `http://${configured}`);
  if (!url.port && process.env[`${service}_PORT`]) url.port = process.env[`${service}_PORT`]!;
  return url.toString().replace(/\/+$/, '');
}

/** Answers an error raised by a route: an UpstreamError keeps its status, anything else is a 502. */
export function routeError(res: Response, error: unknown) {
  return res.status(error instanceof UpstreamError ? error.status : 502).json({
    error: { message: error instanceof UpstreamError ? error.message : 'The service data is unavailable.' },
  });
}
