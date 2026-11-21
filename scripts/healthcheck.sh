#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [ -f .env.staging ]; then
  set -a
  # shellcheck disable=SC1091
  . ./.env.staging
  set +a
fi

STAGING_URL="${STAGING_URL:-http://127.0.0.1}"
HEALTH_URL="${HEALTH_URL:-${STAGING_URL%/}/api/health}"

for _ in $(seq 1 30); do
  if curl -fsS "$HEALTH_URL" >/dev/null 2>&1; then
    echo "OK  staging health ($HEALTH_URL)"
    exit 0
  fi
  sleep 2
done

echo "FAIL staging health ($HEALTH_URL)"
curl -sS "$HEALTH_URL" || true
exit 1
