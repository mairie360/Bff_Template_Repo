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
## Security building blocks (`src/security.ts`)

- `securityHeaders`: `helmet` with the same configuration as BFF User (CSP without `upgrade-insecure-requests`, `X-Content-Type-Options`, CORP, no `X-Powered-By`), mounted first in `src/index.ts`.
- `createRateLimiter(options)`: `express-rate-limit` to put in front of sensitive routes (sign-in, one-time tokens, password reset). Counts failed requests only by default and answers 429 with `Retry-After`. Environment: `RATE_LIMIT_ENABLED` (`false` disables it), `RATE_LIMIT_WINDOW_MS` (default 900000), `RATE_LIMIT_MAX` (default 10).
- `TRUST_PROXY`: Express `trust proxy` (hop count, `true`, or trusted subnets). Set it behind the ingress so that `req.ip`, and therefore the rate limits, is the real client and not the proxy.
