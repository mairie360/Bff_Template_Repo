# Bff_Template_Repo

Template of the Mairie360 Backend-for-Frontend (BFF) repositories: an Express 5 + TypeScript
service with the same skeleton as the BFFs (`BFF_user`, `BFF_Settings`, ...), its OpenAPI contract
generated from the code, a Core API client built on the published `@mairie360/core-api-openapi`
package, and the ZAP / k6 test stacks with the OpenAPI coverage gate.

## Layout

- `src/app.ts`: the Express app (security headers, JSON 404/400, `/docs`, `/openapi.json`,
  `/swagger.json`); `src/index.ts` loads `.env` (`import 'dotenv/config'`, first line), checks the
  upstream configuration with the lib's `assertConfigured` and starts the app on `PORT`.
- `src/openapi-registry.ts`: the `zod-to-openapi` registry. Every route module in `src/routes/`
  registers its paths and schemas on import; `src/openapi.ts` imports them and builds the document.
- `src/clients/`: `coreClient.ts`, which wraps the generated Core API client. The caller's session is read by `@mairie360/bffs-lib` only: `requireBearer` in
  front of every session-bound router (401 before any upstream call) and `authorization(req)` to
  forward it. `Authorization: Bearer <token>` is the only credential; cookies and `x-session-token`
  are ignored (the fronts' proxy turns the `accessToken` cookie into the header). Wrap every other upstream API the same
  way, from its `@mairie360/<name>-api-openapi` package.
- `src/routes/`: `GET /health`, `GET /check_apis` (upstream reachability) and an example
  authenticated route, `GET /example/profile`, which forwards the caller's session to Core API.
- `contracts/openapi.json` + `contracts/bff.d.ts`: the generated contract, committed.
- `tests/`: unit tests, the Core API contract tests (`upstream-contracts.test.ts`) and the whole
  app against a contract-driven Core API mock (`example.upstream-mocks.test.ts`). The files of
  `tests/support/` are shared verbatim with the BFFs: keep them identical.

## Configuration

Every upstream service is configured by `<SERVICE>_URL` (scheme optional, `http` by default) and
optionally `<SERVICE>_PORT` (used when the URL has no port): `CORE_API`, `PROJECT_API`,
`CALENDAR_API`, `MESSAGE_API`, `ELEARNING_API`, `USER_BFF`, `PROJECT_BFF`, `CALENDAR_BFF`, the names
the Helm chart injects. The lib's `baseUrl('<SERVICE>')` reads them on every call: there is no
`localhost` default and no URL frozen at import (never `axios.create({ baseURL })`). A missing or
invalid variable makes the BFF refuse to start (`assertConfigured([...])` in `src/index.ts`, list
every upstream there) and, if it disappears at runtime, the routes that need it answer 503 (declare
it in their contract). `PORT` defaults to `4000`; `TRUST_PROXY`: see below. `.env.example` lists them.

Telemetry (MAIR-504): `src/telemetry.ts` starts the lib's OpenTelemetry and is imported by `src/index.ts`
right after `dotenv/config`, before the app, so that Express is instrumented (keep that order). Traces and
HTTP metrics go over OTLP to `OTEL_EXPORTER_OTLP_ENDPOINT` (the collector of the instance, e.g.
`http://otel-collector:4318`); unset, telemetry is off and tests export nothing. `OTEL_SERVICE_NAME` and
`OTEL_RESOURCE_ATTRIBUTES` (`service.version=<image tag>,deployment.environment.name=prod`) complete the
resource, `OTEL_SDK_DISABLED=true` turns it off. Only the lib's attribute allowlist is exported (method,
status, parameterised route, upstream host): never add span attributes holding request values.

## Commands

`@mairie360/*` packages come from GitHub Packages: export `NODE_AUTH_TOKEN` (a token with
`read:packages`) before `npm ci` (see `.npmrc`).

```bash
npm ci
npm run start                # tsx watch, port 4000 by default (PORT, CORE_API_URL: see .env.example)
npm run build                # tsc --noEmit, then esbuild bundles dist/index.js
npm run lint
npm test                     # jest; CI runs npm test -- --runInBand
npm run contracts:generate   # after any route, schema or status change: commit contracts/
npm run contracts:check      # CI gate: fails when contracts/ is stale
```

`docker compose up --build` runs the BFF alone against a Core API on the host's port 3000
(`CORE_API_URL` overrides it). The production `Dockerfile` and `development.Dockerfile` read the
GitHub Packages credentials from BuildKit secrets:

```bash
docker build --secret id=npmrc,src=.npmrc --secret id=node_auth_token,env=NODE_AUTH_TOKEN -t bff-<name> .
```

## CI

Same workflows as every BFF:

- `.github/workflows/cicd.yml` calls the reusable `mairie360/CICD` `BFFs-cicd.yml` workflow (lint,
  build, tests, Semgrep, then on `main` the `dev-<sha>` image, the ZAP and k6 stacks, the staging and
  prod releases). It is pinned to the same `cicd_version` as the BFFs, and Renovate keeps the `uses:`
  tag and `cicd_version` aligned. The template runs it too, so its skeleton is scanned and load-tested
  like a real BFF: it publishes a `bff-template` image and `@mairie360/bff-template-openapi` package.
- `.github/workflows/contracts.yml` runs `contracts:check` and the tests on every push.
- `.github/workflows/auto-approve.yml` approves Renovate PRs (only `pull-requests: write`).

## Security test stack (OWASP ZAP)

`./security_test.sh` (with `NODE_AUTH_TOKEN` exported) starts the isolated stack of
`docker-compose-security.yml`: database + migrations, `init-test.sql` seed, Redis, Core API,
BFF User and this BFF, then `zap-api-scan.py` replays every operation of `/openapi.json` with a
static admin JWT (`sub=1`, HS256, `JWT_SECRET=b"secret"` in every service) and fails on any
WARN/FAIL alert not neutralized in `.zap/rules.tsv`.

The stack never builds the BFF: it runs the image named by `IMAGE_REF`. In CI, that is the
`dev-<sha>` image `release-dev` has just published, the same artifact that is then promoted to
staging and prod. When `IMAGE_REF` is empty (local use), `security_test.sh` first builds
`bff-template:local` from `development.Dockerfile`, which needs `NODE_AUTH_TOKEN` and `./.npmrc`.

The stack also runs the OpenAPI coverage hook of `mairie360/CICD` (`tests/zap/zap_hooks.py`),
checked out as `cicd-repo/` by the CI jobs and cloned there by `security_test.sh` at the
`cicd_version` pinned in `.github/workflows/cicd.yml` (`CICD_VERSION` overrides it). After the
scan, it fails when an operation of the spec was never reached, or when an operation that requires
`bearerAuth` only got 401/403. The spec (`src/openapi.ts`) requires `bearerAuth` at the top level;
public operations (`/health`, `/check_apis`) declare `security: []` in their `registerPath`, so a
new route is authenticated by default.

## Performance test stack (k6)

`./performance_test.sh` starts the same isolated stack from `docker-compose-performance.yml`, with
k6 (`load-test.js`) in place of ZAP. It tests the image named by `IMAGE_REF` like the security stack
and clones `mairie360/CICD` into `cicd-repo/` the same way. `load-test.js` holds one handler per
operation of `contracts/openapi.json` through the shared `tests/k6/coverage.js`: k6 aborts at init
when an operation has no handler, and fails its `operations_uncovered` threshold when a handler does
not send its request. **Adding a route means adding its handler in `load-test.js`.** Two scenarios
run: `crud` (2 VUs) calls every handler once per iteration, writes included, and carries the gate;
`reads` (ramp to 20 VUs) replays only the GET handlers. Every operation has a `p(95)` threshold by
family (50 ms for `/health`, 150 ms for `/check_apis`, 400 ms for reads, 800 ms for writes), with
`http_req_failed < 1%` and `checks > 99%`.

`contracts/openapi.json` is the reference of both gates: regenerate it with
`npm run contracts:generate` after any route or schema change.

## Shared building blocks (`@mairie360/bffs-lib`)

Every BFF uses `@mairie360/bffs-lib` for what is common to all of them: **import it, never copy a
helper into the BFF**. A generated BFF only keeps its routes, its upstream clients and its contract.
What the template shows:

| Concern | In the template | From the lib |
| --- | --- | --- |
| Session | `app.use('/example', noStore, requireBearer, exampleRouter)` (`src/app.ts`) | `requireBearer` (401 before any upstream call), `authorization(req)` (normalised `Bearer <token>`), `bearerToken`, `unverifiedSubject` (only to shape a request sent upstream with the same token, never to grant access), `noStore` |
| Upstream configuration | `assertConfigured([...])` in `src/index.ts`; every call passes the lib options | `baseUrl(service)`, `assertConfigured(services)` |
| Upstream calls | `src/routes/example.ts` | `asCaller(service, req)`, `withoutSession(service, timeout)`, `callUpstream(service, call, { declared, retry })`, `upstreamError(service, error, declared)` |
| Validation | (no input in the example) | `parseRequest(schema, req.body, 'body')`, `validationError(location, issues)`: 400 `Validation failed` with `<location>.<field>` details |
| `/check_apis` | `src/routes/check_apis.ts` | `checkApis({ <name>: probe })`, `checkApisResponseSchema([names])` |
| Security headers | `src/app.ts` | `securityHeaders` (helmet, mounted first), `apiOnlyHeaders()` (`default-src 'none'` outside `/docs`) |
| Rate limits | (none in the example) | `createRateLimiter(options)`, `sessionKey` |
| Errors | `notFoundHandler` + `errorHandler()` closing `src/app.ts`, `ErrorResponse` in `src/openapi-registry.ts` | `HttpError`, `ErrorResponseSchema`, `mapUpstreamError` |

### Upstream calls

```ts
const profile = await callUpstream(
  'CORE_API',
  async () => ProfileSchema.parse((await coreApi.getMe(asCaller('CORE_API', req))).data),
  { declared: [401, 404], retry: true },
);
```

- `asCaller` checks the session first (401), then reads `CORE_API_URL` (503 when missing); the
  generated client never gets a `baseURL` at import.
- `callUpstream` is the single mapping of upstream failures: the 4xx listed in `declared` (exactly the
  statuses the route declares in its contract) are relayed with a generic message, no answer is a 502
  `The CORE_API service is unavailable.`, an answer the BFF cannot parse a 502 `The CORE_API answer is
  invalid.`, anything else a 502. The upstream body is never relayed.
- `retry: true` retries once on no answer / 502 / 503 / 504: only for idempotent calls (GET), never a POST.

### `/check_apis`

One `<name>: Connected | Unreachable` entry per upstream the BFF calls, probed with the same
variables as the real calls; 200 when all are reachable, 502 otherwise (both declared with the
`CheckApisResponse` schema):

```ts
registry.register('CheckApisResponse', checkApisResponseSchema(['core_api', 'user_bff']).clone());
router.get('/', checkApis({
  core_api: () => coreApi.health(withoutSession('CORE_API', 5_000)),
  user_bff: () => userBff.health(withoutSession('USER_BFF', 5_000)),
}));
```

`.clone()`: the lib builds its schemas before `extendZodWithOpenApi()` runs, and zod 4 only adds
`.openapi()` to schemas created after it (same for `ErrorResponseSchema` in `src/openapi-registry.ts`).

### Security headers and rate limits

- `securityHeaders`: `helmet` (CSP without `upgrade-insecure-requests`, `X-Content-Type-Options`,
  CORP, no `X-Powered-By`), then `apiOnlyHeaders()` for the stricter JSON-API headers, both before
  body parsing so that body-parse errors carry them too.
- `createRateLimiter(options)`: `express-rate-limit` answering 429 in the error envelope with
  `Retry-After`, for sensitive routes (sign-in, one-time tokens, password reset). Counts failed
  requests only by default. Environment `<prefix>_ENABLED` (`false` disables it), `<prefix>_WINDOW_MS`
  (default 900000), `<prefix>_MAX` (default 10), prefix `RATE_LIMIT` unless `envPrefix` is given.
  Never key it on a `sub` decoded without verification: use `sessionKey` for a per-session key.
- `TRUST_PROXY`: Express `trust proxy` (hop count, `true`, or trusted subnets), parsed by the lib's
  `parseTrustProxy`. Set it behind the ingress so that `req.ip`, and therefore the rate limits, is the
  real client and not the proxy.

## Errors

Every error is answered in the envelope shared by all the BFFs, `{ error: { code, message, details } }`,
registered once as the `ErrorResponse` schema (`src/openapi-registry.ts`) and referenced by every error
response of the contract: routes throw `HttpError(status, message?)` or let `callUpstream` /
`parseRequest` throw (Express 5 forwards async rejections); `notFoundHandler` and `errorHandler()` close
`src/app.ts`, keep the status and turn anything unexpected into a generic 500.

## Creating a BFF from this template

- on the lines marked `#change ...`, replace the name `template` and the port `4000`
  (`docker-compose*.yml`, `security_test.sh`, `performance_test.sh`, `.github/workflows/cicd.yml`:
  workflow name and `package_name`) and the default port in `src/index.ts`, `Dockerfile` and
  `.env.example`; name the package in `package.json`, the spec in `src/openapi.ts` and the
  telemetry service in `src/telemetry.ts`;
- replace `src/routes/example.ts` with the BFF's routes (import every route module in
  `src/openapi.ts`, mount the session-bound routers behind `noStore, requireBearer`), add the upstream
  clients it needs in `src/clients/` (no `baseURL`: calls pass `asCaller` / `withoutSession`), their
  service in `assertConfigured` (`src/index.ts`) and their probe in `src/routes/check_apis.ts`, then
  run `npm run contracts:generate`;
- use `@mairie360/bffs-lib` for the session, upstream configuration, upstream errors, validation,
  `/check_apis`, security headers and rate limits: do not copy or re-implement those helpers;
- add the upstream APIs the BFF calls to both test stacks, and remove `bff-user` if it does not
  call it;
- write one `load-test.js` handler per operation (writes restore the seed they change);
- give every request field, query and path parameter of the contract a valid example, with a
  distinct example for DELETE routes, and seed the rows they name in `init-test.sql`;
- keep the quotes around `'Bearer <jwt>'`: `zap-api-scan.py` splits `-z` with `shlex`, and an
  unquoted value only sends `Bearer`, so every authenticated route answers 401.
