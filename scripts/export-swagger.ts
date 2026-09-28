import fs from 'fs';
import path from 'path';
import { openApiDocument } from '../src/openapi';

// Writes the document the BFF serves at /openapi.json (src/openapi.ts), so the exported contract
// and the one ZAP scans are the same.
const outputPath = path.join(process.cwd(), 'openapi.json');
fs.writeFileSync(outputPath, JSON.stringify(openApiDocument, null, 2));

console.log('openapi.json generated');
