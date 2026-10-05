import { getCoreAPIMairie360 } from '@mairie360/core-api-openapi/endpoints/coreAPIMairie360';
import axios from 'axios';

// Core API is only called through the operations of its published contract (@mairie360/core-api-openapi).
// Wrap every other upstream API the same way, from its own @mairie360/<name>-api-openapi package.
//
// No baseURL nor timeout here: every call passes the options built by @mairie360/bffs-lib, which read
// CORE_API_URL / CORE_API_PORT at call time (no localhost default):
// - `asCaller('CORE_API', req)` on behalf of the caller (401 without a Bearer token, 503 when not configured);
// - `withoutSession('CORE_API', timeout)` for calls without a session (availability probes);
// and run it through `callUpstream('CORE_API', call, { declared })`, the single mapping of upstream failures.
const coreAxios = axios.create({ headers: { Accept: 'application/json' } });

export const coreApi = getCoreAPIMairie360(coreAxios);
