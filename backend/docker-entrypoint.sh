#!/bin/sh
set -e

echo "==> PriceWatch Backend: Sincronizando esquema de base de datos..."
npx prisma db push --skip-generate

echo "==> PriceWatch Backend: Aplicando seed de productos iniciales..."
node prisma/seed.js || true

echo "==> PriceWatch Backend: Iniciando servidor HTTP..."
exec "$@"
