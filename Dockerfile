# --- Stage 1: build ---
FROM node:24-alpine AS builder
WORKDIR /app
COPY package*.json ./

# The GitHub Packages credentials are only available during npm ci.
RUN --mount=type=secret,id=npmrc,target=/app/.npmrc \
    --mount=type=secret,id=node_auth_token,env=NODE_AUTH_TOKEN \
    npm ci

COPY . .
RUN npm run build

# Keep only the production dependencies for the runtime.
RUN --mount=type=secret,id=npmrc,target=/app/.npmrc \
    --mount=type=secret,id=node_auth_token,env=NODE_AUTH_TOKEN \
    npm ci --omit=dev --ignore-scripts

# --- Stage 2: runtime ---
FROM node:24-alpine
ENV NODE_ENV=production
RUN apk add --no-cache curl

WORKDIR /app
# Files stay owned by root: the node user cannot modify the code it runs.
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./

USER node

# Cap the heap at 180 MB to fit a 256 MB Kubernetes memory limit.
ENV NODE_OPTIONS="--max-old-space-size=180"

#change port
EXPOSE 4000
CMD ["node", "dist/index.js"]
