import { OpenAPIRegistry, extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

// Adds the .openapi() methods to Zod.
extendZodWithOpenApi(z);

export const registry = new OpenAPIRegistry();

// Credential read by `authorization()` (clients/upstream.ts) and forwarded to the upstream APIs.
// The document requires it on every operation (`openapi.ts`); public operations opt out with
// `security: []`. The ZAP OpenAPI coverage gate reads this to tell which operations must be
// reached authenticated.
export const bearerAuth = registry.registerComponent('securitySchemes', 'bearerAuth', {
  type: 'http',
  scheme: 'bearer',
  bearerFormat: 'JWT',
});

// Body of every error answer (`routeError()` in clients/upstream.ts, 404 and 400 in app.ts).
export const ErrorSchema = registry.register('Error', z.object({ error: z.object({ message: z.string() }) }));
