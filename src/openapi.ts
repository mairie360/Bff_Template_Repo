import { OpenApiGeneratorV3 } from '@asteasolutions/zod-to-openapi';
import { bearerAuth, registry } from './openapi-registry';
import './routes/health';
import './routes/check_apis';

// Served at /docs and /openapi.json, and exported by scripts/export-swagger.ts: the scan, the
// coverage gate and the published contract all read the same document. Import every new route
// module here so its registerPath() calls land in the registry.
export const openApiDocument = new OpenApiGeneratorV3(registry.definitions).generateDocument({
  openapi: '3.0.0',
  info: { title: 'bff_template', version: '1.0.0' }, //change bff name
  // Session JWT in the Authorization header, unless the operation declares `security: []`.
  security: [{ [bearerAuth.name]: [] }],
});
