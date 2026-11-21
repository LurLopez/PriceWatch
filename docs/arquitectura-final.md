# Arquitectura final — PriceWatch EF

## 1. Vista de contexto

```text
                    ┌─────────────────────────────┐
                    │  Usuario web / PWA / Android │
                    └──────────────┬──────────────┘
                                   │ HTTPS
                                   ▼
                    ┌─────────────────────────────┐
                    │ Frontend Angular + Ionic     │
                    │ Nginx / PWA / Capacitor      │
                    └──────────────┬──────────────┘
                                   │ /api (REST + JWT)
                                   ▼
                    ┌─────────────────────────────┐
                    │ NestJS API Gateway           │
                    │ Auth, roles, validación,     │
                    │ métricas, logs, orquestación │
                    └───────┬──────────────┬──────┘
                            │              │
                  Prisma    │              │ HTTP interno
                            ▼              ▼
                 ┌────────────────┐  ┌────────────────────┐
                 │ PostgreSQL 16  │  │ FastAPI + MAUT      │
                 │ usuarios,      │  │ normalización,      │
                 │ productos,     │  │ perfiles, fuente    │
                 │ historial,     │  └─────────┬──────────┘
                 │ fuente         │            │ HTTPS
                 └────────────────┘            ▼
                                        ┌──────────────┐
                                        │ DummyJSON    │
                                        │ datos demo   │
                                        └──────────────┘
```

## 2. Vista de contenedores

| Contenedor | Tecnología | Responsabilidad | Puerto |
|---|---|---|---|
| `frontend` | Angular 21 + Ionic 9 + Nginx | SPA/PWA, proxy `/api`, assets | 80 (host 4200/80) |
| `backend` | NestJS 11 + Prisma | API REST, auth, roles, validación, métricas | 3000 (interno) |
| `python-service` | FastAPI + Pydantic | MAUT, normalización, preparación de fuente | 8000 (interno) |
| `database` | PostgreSQL 16 | Persistencia relacional | 5432 (interno) |

En desarrollo, Docker Compose expone `127.0.0.1:3001` (backend), `127.0.0.1:8000` (Python), `127.0.0.1:5433` (PostgreSQL) y `4200` (frontend). En staging solo se publica el frontend.

## 3. Componentes del backend

```text
AppModule
├── CommonModule (global)
│   └── RequestContextService (AsyncLocalStorage)
├── MetricsModule
│   ├── MetricsService
│   └── MetricsController (ADMIN)
├── PrismaModule
├── AuthModule (global)
│   ├── AuthController (/api/auth)
│   ├── AuthService (bcrypt + JWT)
│   ├── JwtAuthGuard
│   └── RolesGuard
├── ProductsModule (/api/products)
├── RankingModule (/api/ranking)
├── SourcesModule (/api/sources/demo-products, ADMIN)
└── HealthModule (/api/health)
```

### Flujo de una solicitud autenticada

```text
Request
  → RequestIdMiddleware (x-request-id + AsyncLocalStorage)
  → ThrottlerGuard (límite global/ruta)
  → JwtAuthGuard (firma, expiración, usuario activo)
  → RolesGuard (@Roles)
  → ValidationPipe (DTO)
  → Controller → Service
  → Prisma / FastAPI
  → LoggingInterceptor (JSON + métricas)
  → AllExceptionsFilter (error seguro)
Response
```

## 4. Flujo de evaluación

```text
Angular evaluador
  → POST /api/ranking/evaluate { weights, context_profile, source_run_id? }
  → JwtAuthGuard + RolesGuard
  → RankingService
      → productos del catálogo o de la corrida
      → POST http://python-service:8000/evaluate (x-request-id)
      → FastAPI calcula MAUT y devuelve ranking + explicación
      → si FastAPI falla: fallback local en NestJS
  → RankingHistory (Prisma, userId)
  → respuesta al frontend
```

## 5. Flujo de obtención web

```text
Angular (ADMIN) → POST /api/sources/demo-products/search
  → NestJS valida DTO, throttle y bandera
  → FastAPI consulta DummyJSON (timeout 10 s, sin redirecciones)
  → normaliza, valida, deduplica y calcula SHA-256
  → NestJS valida contrato y persiste SourceRun + SourceListing
  → respuesta con run_id, métricas y procedencia
```

## 6. Despliegue

### Desarrollo

```text
docker compose up --build -d
  ├── database (volumen)
  ├── python-service
  ├── backend (migrate deploy + seed)
  └── frontend (Nginx)
```

### Staging

```text
GitHub Actions
  → build/push GHCR (tags SHA + latest)
  → SSH al VPS
  → scripts/deploy.sh
      → docker compose -f docker-compose.staging.yml pull/up
      → healthcheck.sh
      → rollback automático si falla
      → .last_image_tag
```

## 7. Responsabilidades y límites

- **Angular** no accede a PostgreSQL ni a FastAPI directamente.
- **NestJS** es el único punto de entrada y el único que escribe en las tablas de negocio.
- **FastAPI** no modifica tablas; recibe datos y devuelve cálculos.
- **PostgreSQL** es la fuente de verdad de usuarios, productos, historial y procedencia.
- **Nginx** sirve la SPA y hace proxy de `/api`.

## 8. ADRs

- ADR-001: arquitectura centralizada con NestJS como gateway y FastAPI como motor.
- ADR-002: MAUT con normalización Min-Max.
- ADR-003: autenticación JWT y roles.
- ADR-004: PWA y Android con Capacitor.
- ADR-005: Ionic y formularios reactivos.
- ADR-006: staging, GHCR y rollback.
- ADR-007: observabilidad y seguridad operativa.

## 9. Decisiones de escalabilidad

- Separar el cálculo analítico permite escalar FastAPI de forma independiente.
- NestJS mantiene el contrato HTTP y la autorización; el frontend no conoce detalles internos.
- El historial y la procedencia permiten auditar decisiones.
- Para producción con varias réplicas se recomienda mover métricas a Prometheus/OpenTelemetry, rate limiting a Redis y secretos a un gestor dedicado.
