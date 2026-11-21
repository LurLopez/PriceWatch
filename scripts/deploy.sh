#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.staging.yml}"
ENV_FILE="${ENV_FILE:-.env.staging}"
IMAGE_PREFIX="${IMAGE_PREFIX:?IMAGE_PREFIX es obligatorio, por ejemplo ghcr.io/lurlopez/pricewatch}"
IMAGE_TAG="${IMAGE_TAG:?IMAGE_TAG es obligatorio}"
export IMAGE_PREFIX IMAGE_TAG

if [ ! -f "$ENV_FILE" ]; then
  echo "Falta $ENV_FILE"
  exit 1
fi

if [ -f .last_image_tag ]; then
  PREVIOUS_TAG="$(cat .last_image_tag)"
else
  PREVIOUS_TAG="${PREVIOUS_TAG:-latest}"
fi
export PREVIOUS_TAG

echo "==> Desplegando $IMAGE_PREFIX con tag $IMAGE_TAG"
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" pull
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up -d --remove-orphans

if ./scripts/healthcheck.sh; then
  printf '%s\n' "$IMAGE_TAG" > .last_image_tag
  echo "==> Despliegue correcto ($IMAGE_TAG)"
  exit 0
fi

echo "==> Falló el health check; volviendo a $PREVIOUS_TAG"
IMAGE_TAG="$PREVIOUS_TAG" docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up -d --remove-orphans
if ./scripts/healthcheck.sh; then
  echo "==> Rollback correcto ($PREVIOUS_TAG)"
else
  echo "==> El rollback también falló; revisar logs del servidor"
fi
exit 1
