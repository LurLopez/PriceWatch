#!/bin/sh
set -e

echo "==> PriceWatch Backend: Verificando estado de migraciones..."
BASELINE_STATE=$(node prisma/baseline.js | tail -n 1)

if [ "$BASELINE_STATE" = "BASELINE_NEEDED" ]; then
  echo "==> Base existente sin historial de migraciones: aplicando baseline..."
  npx prisma migrate resolve --applied 20261121000000_init
fi

echo "==> PriceWatch Backend: Aplicando migraciones..."
npx prisma migrate deploy

echo "==> PriceWatch Backend: Aplicando seed de productos y usuarios..."
node prisma/seed.js || true

echo "==> PriceWatch Backend: Iniciando servidor HTTP..."
exec "$@"
