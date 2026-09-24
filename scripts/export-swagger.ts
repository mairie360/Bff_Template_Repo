import fs from 'fs';
import path from 'path';
import { openApiDocument } from '../src/openapi';

// Writes the document the BFF serves at /openapi.json (src/openapi.ts), so the committed contract,
// the one ZAP scans and the coverage reference of load-test.js are the same. Run it after any
// route or schema change and commit the result.
const outputPath = path.join(process.cwd(), 'contracts', 'openapi.json');
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(openApiDocument, null, 2)}\n`);

console.log('contracts/openapi.json generated');
