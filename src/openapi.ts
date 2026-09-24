import 'dotenv/config';
import { OpenApiGeneratorV31 } from '@asteasolutions/zod-to-openapi';
import { bearerAuth, registry } from './openapi-registry';
import './routes/health';
import './routes/check_apis';
import './routes/example';

// Served at /docs and /openapi.json, and exported by scripts/export-swagger.ts: the ZAP scan, the
// coverage gate and the published contract all read the same document. Import every new route
// module here so its registerPath() calls land in the registry.
export const openApiDocument = new OpenApiGeneratorV31(registry.definitions).generateDocument({
  openapi: '3.1.0',
  // Snake_case like the Rust APIs: orval derives endpoints/bffTemplate.ts + getBffTemplate() from it.
  info: { title: 'bff_template', version: '1.0.0' }, //change bff name
  // Session JWT in the Authorization header, unless the operation declares `security: []`.
  security: [{ [bearerAuth.name]: [] }],
});
