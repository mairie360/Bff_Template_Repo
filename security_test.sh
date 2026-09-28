#!/usr/bin/env bash
# Runs the isolated ZAP security stack, prints the scan report and tears the stack down.

COMPOSE_FILE="docker-compose-security.yml"
SERVICE_NAME="security-scan"

echo "==> [1/4] Starting the stack and the ZAP scan..."
docker compose -f "$COMPOSE_FILE" up -d --build

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
