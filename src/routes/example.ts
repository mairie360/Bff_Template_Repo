import { Router } from 'express';
import { z } from 'zod';
import { ErrorSchema, registry } from '../openapi-registry';
import { asCaller, coreApi, coreError } from '../clients/coreClient';
import { routeError } from '../clients/upstream';

// Example of an authenticated route: it forwards the caller's session to Core API through the
// generated client and only exposes the fields its own contract declares. Replace it with the
// routes of the BFF (and update load-test.js, init-test.sql and the tests accordingly).

const router = Router();

export const ProfileSchema = registry.register('Profile', z.object({
  first_name: z.string().openapi({ example: 'Anne' }),
  last_name: z.string().openapi({ example: 'Le Gall' }),
  email: z.string().openapi({ example: 'anne.le-gall@mairie360.fr' }),
}));

const errors = (...statuses: number[]) => Object.fromEntries(statuses.map((status) => [status, {
  description: { 401: 'Missing or invalid session', 502: 'Core API is unavailable or answered an invalid body', 503: 'Core API is not configured' }[status] ?? 'Error relayed from Core API',
  content: { 'application/json': { schema: ErrorSchema } },
}]));

registry.registerPath({
  method: 'get',
  path: '/example/profile',
  tags: ['Example'],
  summary: "Profile of the signed-in user (Core API GET /api/v1/user/me/)",
  responses: {
    200: { description: 'Profile of the caller', content: { 'application/json': { schema: ProfileSchema } } },
    ...errors(401, 404, 502, 503),
  },
});

router.get('/profile', async (req, res) => {
  try {
    const { data } = await coreApi.getMe(asCaller(req));
    // parse() drops the Core fields the contract does not expose (groups, role, status, phone).
    res.json(ProfileSchema.parse(data));
  } catch (error) {
    routeError(res, coreError(error));
  }
});

export default router;
