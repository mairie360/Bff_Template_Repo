# Bff_Template_Repo

Template of the Mairie360 Backend-for-Frontend (BFF) repositories: an Express 5 + TypeScript
service with the same skeleton as the BFFs (`BFF_user`, `BFF_Settings`, ...), its OpenAPI contract
generated from the code, a Core API client built on the published `@mairie360/core-api-openapi`
package, and the ZAP / k6 test stacks with the OpenAPI coverage gate.

## Layout

- `src/app.ts`: the Express app (security headers, JSON 404/400, `/docs`, `/openapi.json`,
  `/swagger.json`); `src/index.ts` starts it on `PORT`.
- `src/openapi-registry.ts`: the `zod-to-openapi` registry. Every route module in `src/routes/`
  registers its paths and schemas on import; `src/openapi.ts` imports them and builds the document.
- `src/clients/`: `upstream.ts` (caller session, upstream base URL, error answers) and
  `coreClient.ts`, which wraps the generated Core API client. Wrap every other upstream API the same
  way, from its `@mairie360/<name>-api-openapi` package.
- `src/routes/`: `GET /health`, `GET /check_apis` (upstream reachability) and an example
  authenticated route, `GET /example/profile`, which forwards the caller's session to Core API.
- `contracts/openapi.json` + `contracts/bff.d.ts`: the generated contract, committed.
- `tests/`: unit tests, the Core API contract tests (`upstream-contracts.test.ts`) and the whole
  app against a contract-driven Core API mock (`example.upstream-mocks.test.ts`). The files of
  `tests/support/` are shared verbatim with the BFFs: keep them identical.

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

`.github/workflows/contracts.yml` runs lint, build, `contracts:check` and the tests on every push.
`.github/workflows/cicd.yml` (the reusable `mairie360/CICD` `BFFs-cicd.yml` workflow: release,
image, ZAP and k6 stacks) is commented out on the template, which must not publish a package or an
image: uncomment it in the BFF created from it.

## Security test stack (OWASP ZAP)

`./security_test.sh` (with `NODE_AUTH_TOKEN` exported) starts the isolated stack of
`docker-compose-security.yml`: database + migrations, `init-test.sql` seed, Redis, Core API,
BFF User and this BFF, then `zap-api-scan.py` replays every operation of `/openapi.json` with a
static admin JWT (`sub=1`, HS256, `JWT_SECRET=b"secret"` in every service) and fails on any
WARN/FAIL alert not neutralized in `.zap/rules.tsv`.

The stack never builds the BFF: it runs the image named by `IMAGE_REF`. In CI, that is the
`dev-<sha>` image `release-dev` has just published, the same artifact that is then promoted to
staging and prod. When `IMAGE_REF` is empty (local use), `security_test.sh` first builds
`bff-{bff}:local` from `development.Dockerfile`, which needs `NODE_AUTH_TOKEN` and `./.npmrc`.

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

## Creating a BFF from this template

- replace `{bff}` and `{port}` on the lines marked `#change ...` (`docker-compose*.yml`,
  `security_test.sh`, `performance_test.sh`, `.github/workflows/cicd.yml`) and the default port in
  `src/index.ts`, `Dockerfile` and `.env.example`; name the package in `package.json` and the spec
  in `src/openapi.ts`;
- uncomment `.github/workflows/cicd.yml` and set its `package_name`;
- replace `src/routes/example.ts` with the BFF's routes (import every route module in
  `src/openapi.ts`), add the upstream API clients it needs in `src/clients/` and their probe in
  `src/routes/check_apis.ts`, then run `npm run contracts:generate`;
- add the upstream APIs the BFF calls to both test stacks, and remove `bff-user` if it does not
  call it;
- write one `load-test.js` handler per operation (writes restore the seed they change);
- give every request field, query and path parameter of the contract a valid example, with a
  distinct example for DELETE routes, and seed the rows they name in `init-test.sql`;
- keep the quotes around `'Bearer <jwt>'`: `zap-api-scan.py` splits `-z` with `shlex`, and an
  unquoted value only sends `Bearer`, so every authenticated route answers 401.
