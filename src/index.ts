import 'dotenv/config';
// Before the app: OpenTelemetry must hook Express before it is loaded (MAIR-504).
import './telemetry';
import { assertConfigured, sessionKeysFromEnv } from '@mairie360/bffs-lib';
import app from './app';

// Every upstream service the BFF calls (`<SERVICE>_URL`, optional `<SERVICE>_PORT`): add the others
// here (`USER_BFF`, `PROJECT_API`...) when the BFF calls them.
export const UPSTREAMS = ['CORE_API'] as const;

/**
 * Fail fast: refuse to start, naming every missing or invalid upstream URL, or without a session key, instead of
 * answering 503. The session tokens are verified with Core's public key `JWT_PUBLIC_KEY` (MAIR-680, bffs-lib
 * requireSession); `JWT_SECRET` alone is still accepted during the transition (HS256 tokens).
 */
export function assertStartupConfiguration(): void {
  assertConfigured(UPSTREAMS);
  let keys: ReturnType<typeof sessionKeysFromEnv>;
  try {
    keys = sessionKeysFromEnv();
  } catch {
    // The parsing detail is not needed to fix it, and the key is not logged.
    throw new Error('Invalid configuration: JWT_PUBLIC_KEY must hold Ed25519 PUBLIC KEY PEM blocks');
  }
  if (keys === undefined) {
    throw new Error('Missing configuration: JWT_PUBLIC_KEY (or JWT_SECRET during the HS256 transition)');
  }
}

if (require.main === module) {
  assertStartupConfiguration();
  const listenPort = Number(process.env.PORT ?? 4000); //change port
  app.listen(listenPort, () => console.log(`Server listening on port ${listenPort}`));
}
