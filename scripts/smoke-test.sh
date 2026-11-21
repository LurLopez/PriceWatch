#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

ENV_FILE="${SMOKE_ENV_FILE:-.env}"
if [ -f "$ENV_FILE" ]; then
  set -a
  # shellcheck disable=SC1091
  . "./$ENV_FILE"
  set +a
fi

API_URL="${API_URL:-http://127.0.0.1:${BACKEND_PORT:-3001}/api}"
WEB_URL="${WEB_URL:-http://127.0.0.1:${FRONTEND_PORT:-4200}}"

wait_for() {
  local url="$1"
  local label="$2"
  for _ in $(seq 1 60); do
    if curl -fsS "$url" >/dev/null 2>&1; then
      echo "OK  $label"
      return 0
    fi
    sleep 2
  done
  echo "FAIL $label ($url)"
  return 1
}

assert_status() {
  local expected="$1"
  local method="$2"
  local url="$3"
  local label="$4"
  shift 4
  local status
  status="$(curl -sS -o /dev/null -w '%{http_code}' -X "$method" "$@" "$url")"
  if [ "$status" != "$expected" ]; then
    echo "FAIL $label: esperado $expected, obtenido $status"
    exit 1
  fi
  echo "OK  $label ($status)"
}

assert_status 200 GET "$API_URL/health" "health NestJS/PostgreSQL/FastAPI" \
  -H 'x-request-id: smoke-health-001'

HEALTH_ID="$(curl -sS -D - -o /dev/null -H 'x-request-id: smoke-health-002' "$API_URL/health" | awk -F': ' 'tolower($1)=="x-request-id" {print $2}' | tr -d '\r')"
if [ "$HEALTH_ID" != "smoke-health-002" ]; then
  echo "FAIL x-request-id no propagado (obtenido: ${HEALTH_ID:-vacío})"
  exit 1
fi
echo "OK  x-request-id propagado"

assert_status 200 GET "$WEB_URL/" "frontend web"
assert_status 200 GET "$WEB_URL/manifest.webmanifest" "manifest PWA"

assert_status 401 GET "$API_URL/ranking/history" "historial sin token"

ADMIN_LOGIN="$(curl -sS -X POST "$API_URL/auth/login" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"${ADMIN_EMAIL}\",\"password\":\"${ADMIN_PASSWORD}\"}")"
ADMIN_TOKEN="$(printf '%s' "$ADMIN_LOGIN" | jq -r '.accessToken // empty')"
if [ -z "$ADMIN_TOKEN" ]; then
  echo "FAIL login ADMIN: $ADMIN_LOGIN"
  exit 1
fi
echo "OK  login ADMIN"

assert_status 200 GET "$API_URL/auth/me" "perfil ADMIN" \
  -H "Authorization: Bearer $ADMIN_TOKEN"

USER_LOGIN="$(curl -sS -X POST "$API_URL/auth/login" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"${DEMO_USER_EMAIL}\",\"password\":\"${DEMO_USER_PASSWORD}\"}")"
USER_TOKEN="$(printf '%s' "$USER_LOGIN" | jq -r '.accessToken // empty')"
if [ -z "$USER_TOKEN" ]; then
  echo "FAIL login USER: $USER_LOGIN"
  exit 1
fi
echo "OK  login USER"

assert_status 403 GET "$API_URL/sources/demo-products/runs" "fuente solo ADMIN" \
  -H "Authorization: Bearer $USER_TOKEN"

assert_status 201 POST "$API_URL/ranking/evaluate" "ranking USER" \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $USER_TOKEN" \
  -d '{"weights":{"weight_price":0.4,"weight_quality":0.3,"weight_stock":0.1,"weight_specs":0.2},"context_profile":"equilibrado"}'

assert_status 200 GET "$API_URL/ranking/history" "historial USER" \
  -H "Authorization: Bearer $USER_TOKEN"

assert_status 200 GET "$API_URL/metrics" "métricas ADMIN" \
  -H "Authorization: Bearer $ADMIN_TOKEN"

echo "Smoke test completado correctamente."
