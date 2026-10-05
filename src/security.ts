import { buildErrorResponse } from '@mairie360/bffs-lib';
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
 * Answers 429 in the shared error envelope with `Retry-After`. Counters live in memory, per replica.
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
    message: buildErrorResponse('TOO_MANY_REQUESTS', RATE_LIMIT_MESSAGE),
  });
}
