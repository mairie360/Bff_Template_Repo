import 'dotenv/config';
import {
  apiOnlyHeaders, errorHandler, noStore, notFoundHandler, parseTrustProxy, requireBearer, securityHeaders,
} from '@mairie360/bffs-lib';
import express from 'express';
import swaggerUi from 'swagger-ui-express';
import { openApiDocument } from './openapi';
import healthRouter from './routes/health';
import checkApis from './routes/check_apis';
import exampleRouter from './routes/example';

export const app = express();
app.disable('x-powered-by');
// Client IP (req.ip), the key of the lib's createRateLimiter: TRUST_PROXY behind the ingress.
app.set('trust proxy', parseTrustProxy(process.env.TRUST_PROXY));
// Security headers on every response (helmet, shared by every BFF), /docs included.
app.use(securityHeaders);
// API-only surface: stricter headers (`default-src 'none'`...) everywhere but /docs. Mounted before body
// parsing so they also cover body-parse error responses.
app.use(apiOnlyHeaders());

app.use(express.json());

// Interactive documentation, and the JSON spec: /openapi.json is the target of the ZAP scan
// (docker-compose-security.yml), /swagger.json is read by the CI composite action.
app.use('/docs', swaggerUi.serve, swaggerUi.setup(openApiDocument));
app.get(['/openapi.json', '/swagger.json'], (_req, res) => res.json(openApiDocument));

app.use('/health', healthRouter);
app.use('/check_apis', checkApis);
// Session-bound routers: never cached by a proxy or the browser (noStore), and a 401 before any
// upstream call when the request has no `Authorization: Bearer <token>` (requireBearer).
app.use('/example', noStore, requireBearer, exampleRouter);

// Unknown routes and every error end in the shared envelope `{ error: { code, message, details } }`:
// the status of the error is kept (400 for an unparsable body, 401, 404, 502, 503...) and anything
// unexpected becomes a 500 without leaking its message.
app.use(notFoundHandler);
app.use(errorHandler());

export default app;
