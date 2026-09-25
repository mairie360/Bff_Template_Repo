import type { Request, RequestHandler } from 'express';
import helmet from 'helmet';
import { ipKeyGenerator, rateLimit } from 'express-rate-limit';

/**
 * Security building blocks shared by every BFF generated from this template.
 */

/**
 * Security headers (CSP, X-Content-Type-Options, Permissions-Policy, CORP, ...) and removal of
 * X-Powered-By, with the same configuration as BFF User. upgrade-insecure-requests is dropped
 * because the BFF is served over HTTP behind the reverse proxy.
 */
export const securityHeaders: RequestHandler = helmet({
  contentSecurityPolicy: {
    useDefaults: true,
    directives: { 'upgrade-insecure-requests': null },
  },
});

/**
 * Parses `TRUST_PROXY` into Express' `trust proxy` setting: unset or `false` → no proxy trusted
 * (default), `true` → every hop, an integer → number of trusted hops, anything else →
 * comma-separated trusted addresses/subnets (e.g. `loopback, 10.0.0.0/8`). Behind the ingress,
 * set it so that `req.ip` (and therefore the rate limits) is the real client, not the proxy.
 */
export function parseTrustProxy(value: string | undefined): boolean | number | string {
  const trimmed = value?.trim();
  if (!trimmed || trimmed.toLowerCase() === 'false') return false;
  if (trimmed.toLowerCase() === 'true') return true;
  if (/^\d+$/.test(trimmed)) return Number(trimmed);
  return trimmed;
}

export const RATE_LIMIT_MESSAGE = 'Too many attempts, please try again later';

export interface RateLimiterOptions {
  /** Window length in ms. Default: `RATE_LIMIT_WINDOW_MS` or 15 minutes. */
  windowMs?: number;
  /** Requests allowed per key and window. Default: `RATE_LIMIT_MAX` or 10. */
  limit?: number;
  /** Only count failed requests (status >= 400): right for sign-in routes. Default: true. */
  failedOnly?: boolean;
  /** Extra key part (e.g. the account e-mail) appended to the client IP. */
  keyOf?: (req: Request) => string;
  /** Disabled when false. Default: `RATE_LIMIT_ENABLED` is not `false`. */
  enabled?: boolean;
}

function positiveInteger(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

/**
 * Rate limiter to put in front of sensitive routes (sign-in, one-time tokens, password reset):
 * `router.post('/login', createRateLimiter({ keyOf: (req) => req.body?.email ?? '' }), handler)`.
 * Answers 429 `{ error: { message } }` with `Retry-After`. Counters live in memory, per replica.
 */
export function createRateLimiter(options: RateLimiterOptions = {}): RequestHandler {
  const enabled = options.enabled ?? process.env.RATE_LIMIT_ENABLED?.trim().toLowerCase() !== 'false';
  const keyOf = options.keyOf;

  return rateLimit({
    windowMs: options.windowMs ?? positiveInteger(process.env.RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
    limit: options.limit ?? positiveInteger(process.env.RATE_LIMIT_MAX, 10),
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    skipSuccessfulRequests: options.failedOnly ?? true,
    skip: () => !enabled,
    keyGenerator: (req) => {
      const ip = ipKeyGenerator(req.ip ?? req.socket.remoteAddress ?? 'unknown');
      return keyOf ? `${ip}|${keyOf(req).trim().toLowerCase()}` : ip;
    },
    message: { error: { message: RATE_LIMIT_MESSAGE } },
  });
}
