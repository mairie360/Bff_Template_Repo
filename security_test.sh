#!/usr/bin/env bash
# Runs the isolated ZAP security stack, prints the scan report and tears the stack down.

COMPOSE_FILE="docker-compose-security.yml"
SERVICE_NAME="security-scan"

# The CI exports IMAGE_REF (the image published by release-dev). Locally, build
# the BFF under test from development.Dockerfile and point the stack at it.
if [ -z "${IMAGE_REF:-}" ]; then
  LOCAL_IMAGE="bff-{bff}:local" #change bff name
  echo "==> [0/4] Building $LOCAL_IMAGE from development.Dockerfile..."
  docker build -f development.Dockerfile -t "$LOCAL_IMAGE" \
    --secret id=npmrc,src=.npmrc \
    --secret id=node_auth_token,env=NODE_AUTH_TOKEN \
    . || exit 1
  export IMAGE_REF="$LOCAL_IMAGE"
fi
echo "==> BFF under test: $IMAGE_REF"

echo "==> [1/4] Starting the stack and the ZAP scan..."
docker compose -f "$COMPOSE_FILE" up -d

echo "==> [2/4] Waiting for the security scan to finish..."
docker compose -f "$COMPOSE_FILE" wait "$SERVICE_NAME"
EXIT_CODE=$?

echo "==> [3/4] Scan report (logs)..."
docker compose -f "$COMPOSE_FILE" logs "$SERVICE_NAME"

echo "==> [4/4] Removing the containers..."
docker compose -f "$COMPOSE_FILE" down -v

echo "----------------------------------------"
echo "Final exit code: $EXIT_CODE"
echo "----------------------------------------"

exit $EXIT_CODE
