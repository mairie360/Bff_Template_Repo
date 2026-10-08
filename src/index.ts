import 'dotenv/config';
// Before the app: OpenTelemetry must hook Express before it is loaded (MAIR-504).
import './telemetry';
import { assertConfigured } from '@mairie360/bffs-lib';
import app from './app';

// Every upstream service the BFF calls (`<SERVICE>_URL`, optional `<SERVICE>_PORT`): add the others
// here (`USER_BFF`, `PROJECT_API`...) when the BFF calls them.
const UPSTREAMS = ['CORE_API'] as const;

if (require.main === module) {
  // Fail fast: refuse to start, naming every missing or invalid upstream URL, instead of answering 503.
  assertConfigured(UPSTREAMS);
  const listenPort = Number(process.env.PORT ?? 4000); //change port
  app.listen(listenPort, () => console.log(`Server listening on port ${listenPort}`));
}
