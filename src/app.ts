import 'dotenv/config';
import express from 'express';
import swaggerUi from 'swagger-ui-express';
import { openApiDocument } from './openapi';
import healthRouter from './routes/health';
import checkApis from './routes/check_apis';
import exampleRouter from './routes/example';

export const app = express();
app.disable('x-powered-by');

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
// Session-bound answers must never be cached by a proxy or the browser.
app.use('/example', (_req, res, next) => { res.setHeader('Cache-Control', 'no-store'); next(); }, exampleRouter);

// JSON 404 and 400 (unparsable body) instead of Express' HTML pages.
app.use((_req, res) => res.status(404).json({ error: { message: 'Unknown route.' } }));
app.use((err: unknown, _req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (res.headersSent) return next(err);
  return res.status(400).json({ error: { message: 'Invalid request body.' } });
});

export default app;
