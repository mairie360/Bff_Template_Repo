# Bff_Template_Repo

## 🏗️ Dépôt Modèle pour Backend for Frontend (BFF)

Ce dépôt sert de point de départ pour créer une application BFF (Backend for Frontend) destinée à interagir avec différents microservices.

---

## ✨ Fonctionnalités

- Serveur basé sur **Express.js**
- Développement en **TypeScript** pour une meilleure sécurité et expérience
- Gestion des variables d’environnement avec **dotenv**
- Route de vérification de santé (health check) intégrée
- Support **Docker** pour la conteneurisation
- Gestion basique des erreurs

---

## ⚠️ Important

Avant de lancer l’application, pensez à définir la variable d’environnement `PORT`.

Créez un fichier `.env` à la racine du projet avec le contenu suivant :

```env
PORT=3000
```

## 🚀 Démarrage Rapide

```bash
# Construire l'image Docker
docker build -t bff-template .

# Lancer le conteneur
docker run -p 3000:3000 --env-file .env bff-template
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

`contracts/openapi.json` is the committed contract: `npx ts-node scripts/export-swagger.ts` rewrites it
from the document the BFF serves, after any route or schema change.

When creating a BFF from this template:

- replace `{bff}` and `{port}` in `docker-compose-security.yml`, `docker-compose-performance.yml`,
  `security_test.sh` and `performance_test.sh` (lines marked `#change ...`) and add the upstream APIs
  the BFF calls to both stacks;
- write one `load-test.js` handler per operation (writes restore the seed they change) and
  regenerate `contracts/openapi.json`;
- set `package_name` in `.github/workflows/cicd.yml`, uncomment it, and name the spec in
  `src/openapi.ts`; import every new route module in `src/openapi.ts`;
- give every request field, query and path parameter of the contract a valid example, with a
  distinct example for DELETE routes, and seed the rows they name in `init-test.sql`;
- keep the quotes around `'Bearer <jwt>'`: `zap-api-scan.py` splits `-z` with `shlex`, and an
  unquoted value only sends `Bearer`, so every authenticated route answers 401.
