# PriceWatch — Backend

API gateway construida con **NestJS 11**, **Prisma** y **PostgreSQL 16**. Orquesta el catálogo, la consulta a la fuente de demostración, el cálculo del ranking en FastAPI y el historial de evaluaciones.

## Requisitos

- Node.js 22+
- PostgreSQL 16 (o Docker Compose desde la raíz)
- Motor FastAPI en `PYTHON_SERVICE_URL`

## Ejecución local

```bash
npm ci
npx prisma generate
npx prisma db push
npx prisma db seed
npm run start:dev
```

La API queda en `http://localhost:3000/api` y Swagger en `http://localhost:3000/api/docs`.

## Comandos

```bash
npm run lint
npm test
npm run build
npm run test:e2e
```

## Módulos

| Módulo | Responsabilidad |
|---|---|
| `health` | Estado de NestJS y conexión a PostgreSQL |
| `products` | Catálogo persistido con respaldo local |
| `ranking` | Orquestación de FastAPI, fallback y persistencia del historial |
| `sources` | Consulta acotada a DummyJSON, métricas y procedencia |
| `auth` | Login básico con credenciales de entorno |

## Variables principales

| Variable | Uso |
|---|---|
| `DATABASE_URL` | Conexión Prisma/PostgreSQL |
| `PYTHON_SERVICE_URL` | URL interna del motor FastAPI |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Credenciales del login básico |
| `DEMO_PRODUCTS_SOURCE_ENABLED` | Habilita la consulta explícita a DummyJSON |

La fuente de demostración está desactivada por defecto. No debe habilitarse en un despliegue público sin proteger las rutas y revisar las condiciones de la API.
