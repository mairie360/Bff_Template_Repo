import { asCaller, callUpstream } from '@mairie360/bffs-lib';
import { Router } from 'express';
import { z } from 'zod';
import { ErrorSchema, registry } from '../openapi-registry';
import { coreApi } from '../clients/coreClient';

// Example of an authenticated route built on @mairie360/bffs-lib: it forwards the caller's session to
// Core API through the generated client and only exposes the fields its own contract declares. Replace
// it with the routes of the BFF (and update load-test.js, init-test.sql and the tests accordingly).
//
// The router is mounted behind `noStore` and `requireBearer` (app.ts): a request without
// `Authorization: Bearer <token>` gets a 401 before any upstream call. Validate request input with the
// lib too: `const body = parseRequest(UpdateSchema, req.body, 'body');` answers a 400 `Validation failed`
// listing every `body.<field>` in error.

const router = Router();

export const ProfileSchema = registry.register('Profile', z.object({
  first_name: z.string().openapi({ example: 'Anne' }),
  last_name: z.string().openapi({ example: 'Le Gall' }),
  email: z.string().openapi({ example: 'anne.le-gall@mairie360.fr' }),
}));

// Core API statuses this route relays as is: every other upstream status becomes a 502.
const RELAYED = [401, 404] as const;

const errors = (...statuses: number[]) => Object.fromEntries(statuses.map((status) => [status, {
  description: { 401: 'Missing or invalid session', 502: 'Core API is unavailable, failed or answered an invalid body', 503: 'Core API is not configured' }[status] ?? 'Error relayed from Core API',
  content: { 'application/json': { schema: ErrorSchema } },
}]));

registry.registerPath({
  method: 'get',
  path: '/example/profile',
  tags: ['Example'],
  summary: "Profile of the signed-in user (Core API GET /api/v1/user/me/)",
  responses: {
    200: { description: 'Profile of the caller', content: { 'application/json': { schema: ProfileSchema } } },
    ...errors(...RELAYED, 502, 503),
  },
});

router.get('/profile', async (req, res) => {
  // callUpstream maps every failure once: the declared Core 4xx are relayed with a generic message, no
  // answer or an unusable one (parse() fails) is a 502 naming CORE_API, anything else a 502; the upstream
  // body is never relayed. `retry: true` (one retry on no answer / 502 / 503 / 504) is for idempotent
  // calls only, never for a POST. Express 5 hands the rejection to errorHandler() (app.ts).
  const profile = await callUpstream(
    'CORE_API',
    // parse() drops the Core fields the contract does not expose (groups, role, status, phone).
    async () => ProfileSchema.parse((await coreApi.getMe(asCaller('CORE_API', req))).data),
    { declared: RELAYED, retry: true },
  );
  res.json(profile);
});

export default router;
