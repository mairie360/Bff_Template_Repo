import express from 'express';
import swaggerUi from 'swagger-ui-express';
import healthRouter from './routes/health';
import checkApis from './routes/check_apis';
import dotenv from 'dotenv';
import { openApiDocument } from './openapi';

dotenv.config();

const app = express();

const PORT = process.env.PORT;

// Interactive documentation
app.use('/docs', swaggerUi.serve, swaggerUi.setup(openApiDocument));

// JSON spec: /openapi.json is the target of the ZAP scan (docker-compose-security.yml),
// /swagger.json is read by the CI composite action.
app.get(['/openapi.json', '/swagger.json'], (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(openApiDocument);
});

if (!PORT) {
  console.error('Error: PORT environment variable is not set.');
  process.exit(1);
}

app.use('/health', healthRouter);
app.use('/check_apis', checkApis);

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
