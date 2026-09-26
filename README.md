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

When creating a BFF from this template:

- replace `{bff}` and `{port}` in `docker-compose-security.yml` (lines marked `#change ...`) and add
  the upstream APIs the BFF calls;
- give every request field, query and path parameter of the contract a valid example, with a
  distinct example for DELETE routes, and seed the rows they name in `init-test.sql`;
- keep the quotes around `'Bearer <jwt>'`: `zap-api-scan.py` splits `-z` with `shlex`, and an
  unquoted value only sends `Bearer`, so every authenticated route answers 401.
