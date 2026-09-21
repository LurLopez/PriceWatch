# PriceWatch — Comparador Multicriterio Inteligente

> **Asignatura:** OII436-1 Ingeniería Web Avanzada — PUCV
> **Autor:** Lur Lopez Fraile (`lur.lopez.f@mail.pucv.cl`)
> **Entrega actual:** EP1 — Arquitectura, flujo vertical mínimo y pipeline DevSecOps
> **Estado:** en desarrollo — tag objetivo `v0.1.0-ep1`

PriceWatch compara productos de comercio electrónico con **múltiples criterios ponderables por el usuario** (precio, calidad, stock y especificaciones) y entrega un ranking **explicable**: no solo dice qué producto conviene, sino por qué, mostrando la normalización y el aporte de cada criterio al puntaje final.

---

## 1. Definición del proyecto

### 1.1 Problema

Los comparadores de precios actuales ordenan el catálogo por un **criterio único**: el precio más bajo o el producto patrocinado por el comercio. Esto ignora las prioridades reales de cada comprador (por ejemplo, alguien que valora más la calidad o la disponibilidad) y no es transparente: el usuario no sabe por qué un producto aparece primero.

### 1.2 Usuarios objetivo

| Perfil | Necesidad principal |
|---|---|
| Compradores analíticos | Comparaciones objetivas con evidencia, no publicidad |
| Profesionales técnicos | Ponderar especificaciones por sobre el precio |
| Usuarios con presupuesto acotado | Maximizar relación precio/beneficio con control del peso del precio |
| Administradores y auditores | Revisar el criterio de evaluación y el historial de rankings |

### 1.3 Objetivos

1. Implementar una evaluación multicriterio ponderable mediante el método **MAUT** con normalización **Min-Max**.
2. Entregar resultados **explicables**: desglose por criterio, aportes ponderados y justificación textual.
3. Construir una arquitectura web de tres capas (cliente, API gateway, motor analítico) con persistencia real.
4. Automatizar la calidad y seguridad con un pipeline **DevSecOps** que bloquee entregas defectuosas.
5. Lograr una aplicación adaptable a escritorio, web móvil y Android.

### 1.4 Alcance de EP1

**Incluye:**

- Flujo vertical mínimo funcional: frontend Ionic → API NestJS → motor FastAPI → PostgreSQL.
- Catálogo de productos persistido en PostgreSQL con migraciones y seed.
- Evaluación multicriterio con degradación elegante ante fallos del motor.
- Autenticación básica con token Bearer (credenciales por variables de entorno).
- Contenerización completa con Docker Compose y pipeline CI/CD en GitHub Actions.
- Documentación de proyecto, arquitectura y decisiones (ADRs).

**No incluye (queda para EP2):**

- Scraping real de múltiples sitios y consumo de la API de Mercado Libre en producción.
- Autenticación con usuarios persistidos, roles y refresh tokens.
- Historial por usuario y alertas de precio.

### 1.5 Funcionalidades

| # | Funcionalidad | Descripción |
|---|---|---|
| F1 | Catálogo | Lista de productos con precio, categoría, marca, calidad, stock y specs; filtro por categoría |
| F2 | Evaluador ponderado | 4 sliders (precio, calidad, stock, specs); los pesos se normalizan si no suman 1 |
| F3 | Ranking explicado | Posición, puntaje 0–100, nivel y desglose por criterio con aportes ponderados |
| F4 | Explicación global | Producto ganador, texto explicativo y advertencias de stock crítico o agotado |
| F5 | Historial | Registro persistido de cada evaluación (pesos, ganador, explicación y fecha) |
| F6 | Salud del sistema | `GET /api/health` verifica NestJS + PostgreSQL + FastAPI |
| F7 | Login básico | `POST /api/auth/login` valida contra variables de entorno y emite token Bearer |
| F8 | Degradación elegante | Si FastAPI falla, NestJS responde `success_fallback` con un ranking de respaldo, nunca un error 500 |

**Niveles del ranking:** `>= 80` Altamente Recomendado · `>= 60` Recomendado · `>= 40` Aceptable · `< 40` No Favorable.

### 1.6 Fuente web

- **EP1:** catálogo propio de ~10 productos de ejemplo (2–3 categorías) cargado por seed, que replica el esquema de la fuente real.
- **EP2:** API pública de **Mercado Libre Chile** (respuestas JSON documentadas) y scraping ético futuro respetando `robots.txt`, con límite de frecuencia y atribución.

### 1.7 Capacidad adaptativa

- **Interfaz adaptable:** componentes Ionic con diseño responsive, probados en escritorio, tablet y móvil.
- **Multiplataforma:** Capacitor habilita empaquetado Android a partir del mismo código; PWA opcional para instalación web.
- **Sistema tolerante a fallos:** timeouts de 4 s hacia el motor analítico y fallback con advertencia explícita al usuario.
- **Arquitectura escalable:** servicios desacoplados (NestJS orquesta, FastAPI calcula) que pueden escalar o reemplazarse de forma independiente.

---

## 2. Arquitectura

```text
Navegador / PWA / Android (Capacitor)
        │  Angular + Ionic (4200 / Nginx :80)
        │  GET /api/products · POST /api/ranking/evaluate
        ▼
NestJS API Gateway (3000)
  ├── Prisma ORM ──────► PostgreSQL 16 (5432)
  └── HTTP + timeout 4s ─► FastAPI (8000) ── normalización Min-Max + MAUT + explicación
```

| Capa | Tecnología |
|---|---|
| Frontend | Ionic 8 + Angular standalone + Capacitor + Nginx |
| Backend | NestJS 11 + Prisma ORM + class-validator + Swagger |
| Base de datos | PostgreSQL 16 (Docker + volumen persistente) |
| Motor analítico | Python 3.12 + FastAPI + MAUT (Min-Max) |
| Infraestructura | Docker Compose + Terraform (provider local, staging) |
| CI/CD | GitHub Actions: lint, tests, auditoría, Gitleaks, quality gate |
| Calidad | ESLint, Angular ESLint, flake8, pytest, Jest, Karma/Jasmine |

---

## 3. Estructura del repositorio

```text
PriceWatch/
├── .github/workflows/ci.yml     # Pipeline DevSecOps
├── backend/                     # API NestJS + Prisma
├── frontend/                    # Cliente Ionic + Angular + Capacitor
├── python-service/              # Motor MAUT en FastAPI
├── infra/                       # Terraform (staging)
├── docs/                        # Plan, diagramas y ADRs
├── .env.example                 # Plantilla de variables (versionada)
├── .editorconfig
├── CONTRIBUTING.md
└── README.md
```

> Las carpetas `backend/`, `frontend/`, `python-service/`, `infra/` y `.github/` se crean en las fases 2–7 del plan (`docs/PLAN-EP1.md`).

---

## 4. Instalación

### 4.1 Docker Compose (recomendado)

```bash
cp .env.example .env          # editar y cambiar las contraseñas
docker compose up --build -d
docker compose ps             # 5 servicios (migrate termina y sale)
curl localhost:8000/health
curl localhost:3000/api/health
curl localhost:3000/api/products
```

Interfaz web en `http://localhost:4200`. Para detener: `docker compose down` (agregar `-v` solo si se quiere borrar la base).

### 4.2 Ejecución manual (desarrollo)

**Base de datos:**

```bash
docker run -d --name pw-db -e POSTGRES_PASSWORD=pricewatch \
  -e POSTGRES_USER=pricewatch_admin -e POSTGRES_DB=pricewatch_db \
  -p 5432:5432 postgres:16-alpine
```

**Motor analítico (Python):**

```bash
cd python-service
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt -r requirements-dev.txt
uvicorn main:app --port 8000 --reload
```

**Backend (NestJS):**

```bash
cd backend
npm ci
npx prisma generate
npx prisma migrate dev
npx prisma db seed
npm run start:dev
```

> Al ejecutar fuera de Docker, ajustar `DATABASE_URL` y `PYTHON_SERVICE_URL` en `.env` para usar `localhost` en vez de los nombres de servicio.

**Frontend (Ionic):**

```bash
cd frontend
npm ci
npm start                     # proxy /api → http://localhost:3000
```

---

## 5. Contratos de API

| Método | Endpoint (NestJS :3000) | Descripción |
|---|---|---|
| `GET` | `/api/health` | Estado de NestJS + PostgreSQL + FastAPI |
| `GET` | `/api/docs` | Swagger / OpenAPI |
| `POST` | `/api/auth/login` | Login básico → token Bearer |
| `GET` | `/api/products?category=` | Catálogo desde PostgreSQL |
| `GET` | `/api/products/:id` | Detalle de producto |
| `POST` | `/api/ranking/evaluate` | Evaluación multicriterio (orquesta FastAPI) |
| `GET` | `/api/ranking/history` | Historial persistido de evaluaciones |
| `GET` | `/health` (FastAPI :8000) | Salud del motor analítico |
| `POST` | `/evaluate` (FastAPI :8000) | Cálculo MAUT |

**Payload `POST /api/ranking/evaluate`:**

```json
{
  "weights": {
    "weight_price": 0.35,
    "weight_quality": 0.30,
    "weight_stock": 0.15,
    "weight_specs": 0.20
  },
  "category": "Laptops",
  "max_price": 1500
}
```

---

## 6. Pruebas

| Componente | Comando | Cobertura |
|---|---|---|
| python-service | `pytest -v` · `flake8 .` | Normalización, pesos, validaciones 400, ranking |
| backend | `npm test` · `npm run lint` | Health, productos (Prisma mockeado), ranking (éxito + fallback) |
| frontend | `npm test -- --watch=false` · `npm run lint` | `ApiService` con `HttpTestingController` |
| infra | `terraform fmt -check` · `terraform validate` | Sintaxis y validez del manifiesto staging |

---

## 7. Pipeline DevSecOps

Workflow `.github/workflows/ci.yml` con jobs independientes y un quality gate final:

1. **frontend:** `npm ci` → lint → tests → build → `npm audit --omit=dev --audit-level=critical`
2. **backend:** `npm ci` → `prisma generate` → lint → tests → build → `npm audit`
3. **python-service:** instalación de dependencias → `flake8` → `pytest -v`
4. **terraform:** `fmt -check` → `init` → `validate` → `plan`
5. **secrets-scanning:** Gitleaks sobre todo el historial (`fetch-depth: 0`)
6. **docker-build:** construye las 3 imágenes, solo si los 5 jobs anteriores pasan; si alguno falla, este job queda **skipped** (evidencia de bloqueo).

---

## 8. Variables y secretos

`cp .env.example .env` y ajustar los valores. El `.env` real está excluido por `.gitignore`; solo se versiona `.env.example`.

| Variable | Descripción |
|---|---|
| `NODE_ENV` | Entorno de ejecución Node |
| `ENVIRONMENT` | Ambiente del despliegue (staging/managed por Terraform) |
| `POSTGRES_DB` / `POSTGRES_USER` / `POSTGRES_PASSWORD` | Credenciales de PostgreSQL |
| `POSTGRES_PORT` | Puerto expuesto de la base |
| `DATABASE_URL` | Cadena de conexión de Prisma |
| `PORT` / `BACKEND_PORT` | Puerto del backend NestJS |
| `PYTHON_SERVICE_URL` / `PYTHON_PORT` | Ubicación y puerto del motor FastAPI |
| `FRONTEND_PORT` | Puerto del cliente |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Credenciales de la auth básica EP1 |

En GitHub Actions: **Variables** `ENVIRONMENT`, `POSTGRES_DB`, `POSTGRES_USER`; **Secrets** `POSTGRES_PASSWORD`.

---

## 9. Prototipo Figma

Enlace al prototipo navegable: _pendiente de publicación (se agrega antes del cierre de EP1)_.

---

## 10. Documentación adicional

- `docs/PLAN-EP1.md` — plan de desarrollo por fases, riesgos y bitácora.
- `CONTRIBUTING.md` — GitFlow, commits convencionales y verificación local.
- `docs/` (Fase 7) — diagramas Mermaid (contexto, contenedores, despliegue), modelo de datos y ADRs.
