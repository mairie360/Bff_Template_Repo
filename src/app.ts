import 'dotenv/config';
import { errorHandler, noStore, notFoundHandler, parseTrustProxy, requireBearer } from '@mairie360/bffs-lib';
import express from 'express';
import swaggerUi from 'swagger-ui-express';
import { openApiDocument } from './openapi';
import healthRouter from './routes/health';
import checkApis from './routes/check_apis';
import exampleRouter from './routes/example';
import { securityHeaders } from './security';

export const app = express();
app.disable('x-powered-by');
// Client IP (req.ip) used by the rate limiters: see parseTrustProxy.
app.set('trust proxy', parseTrustProxy(process.env.TRUST_PROXY));
// Security headers on every response, /docs included; the stricter API-only headers below override them.
app.use(securityHeaders);

// API-only surface: no embedded content, so a hard default-src covers every route below.
// Runs first (before body parsing) so it also covers body-parse error responses; /docs opts out.
app.use((req, res, next) => {
  if (!req.path.startsWith('/docs')) {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Security-Policy', "default-src 'none'");
    res.setHeader('Permissions-Policy', 'geolocation=(), camera=(), microphone=()');
    res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  }
  next();
});

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
