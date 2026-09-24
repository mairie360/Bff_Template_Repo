import { Router } from 'express';
import { z } from 'zod';
import { registry } from '../openapi-registry';
import { coreApi, withoutSession } from '../clients/coreClient';

const router = Router();

// One `<service>: Connected | Unreachable` entry per upstream API: add the other APIs the BFF calls
// to UPSTREAMS, with their client's health operation.
const UPSTREAMS = {
  core_api: () => coreApi.health(withoutSession()),
} as const;

const Reachability = z.enum(['Connected', 'Unreachable']);
export const CheckApisSchema = registry.register('CheckApisResponse', z.object({
  status: z.enum(['OK', 'Error']).openapi({ example: 'OK' }),
  core_api: Reachability.openapi({ example: 'Connected' }),
}));

registry.registerPath({
  method: 'get',
  path: '/check_apis',
  security: [],
  tags: ['Connectivity'],
  summary: 'Checks that the upstream APIs are reachable',
  responses: {
    200: { description: 'Every upstream API is reachable', content: { 'application/json': { schema: CheckApisSchema } } },
    502: { description: 'At least one upstream API is unreachable', content: { 'application/json': { schema: CheckApisSchema } } },
  },
});

router.get('/', async (_req, res) => {
  const services = Object.entries(UPSTREAMS);
  // Async callbacks: a missing configuration is a rejection instead of a throw outside the map.
  const results = await Promise.allSettled(services.map(async ([, probe]) => probe()));
  const ok = results.every((result) => result.status === 'fulfilled');
  res.status(ok ? 200 : 502).json({
    status: ok ? 'OK' : 'Error',
    ...Object.fromEntries(services.map(([name], index) => [name, results[index].status === 'fulfilled' ? 'Connected' : 'Unreachable'])),
  });
});

export default router;
