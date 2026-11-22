# Memoria técnica — Proyecto Final PriceWatch

**Asignatura:** OII436-1 Ingeniería Web Avanzada — PUCV  
**Proyecto:** PriceWatch — Comparador Multicriterio Inteligente  
**Autor:** Lur Lopez Fraile  
**Fecha:** 21 de noviembre de 2026  
**Versión:** 1.0.0-ef  
**Repositorio:** https://github.com/LurLopez/PriceWatch

---

## 0. Resumen ejecutivo

PriceWatch es una aplicación web multiplataforma que compara productos con varios criterios ponderables por el usuario y entrega un ranking explicable. No se limita a mostrar un catálogo: obtiene una muestra de una fuente web, la valida y normaliza, calcula un ranking multicriterio con MAUT y explica por qué un producto queda primero. El usuario puede cambiar el perfil (ahorro, equilibrio, valoraciones o personalizado) y ver cómo cambia la decisión.

La solución completa incluye:

- Frontend Angular 21 + Ionic 9 + Capacitor, con PWA instalable y APK Android.
- Backend NestJS 11 con JWT, roles, validación, Swagger, métricas y logs estructurados.
- Servicio Python FastAPI con MAUT, preparación de fuente, métricas y pruebas.
- PostgreSQL 16 con Prisma, migraciones, seed, índices y trazabilidad.
- Docker Compose de desarrollo y staging, imágenes multi-stage, GHCR, deploy por SSH y rollback.
- Pipeline DevSecOps con Gitleaks, `pip-audit`, Trivy, pruebas, cobertura, integración y quality gate.
- Terraform para el manifiesto de staging y un módulo Docker con red, volumen y PostgreSQL.
- Documentación, ADRs, prototipo navegable y guion de demo/defensa.

**Estado de verificación:** 31 pruebas Jest, 6 e2e, 28 Vitest y 22 pytest aprobadas; cobertura Python 90 %, backend ~50 % de líneas y frontend ~45 % de líneas. El stack de desarrollo y el compose de staging se probaron con Docker; el smoke test completo pasó. La APK se instaló y se verificó el login en un emulador Android.

---

## 1. Problema, usuarios y propuesta de valor

### 1.1 Problema

Los comparadores de precios suelen ordenar por un único criterio: el precio más bajo o el producto patrocinado. Eso ignora que cada comprador tiene prioridades distintas (calidad, disponibilidad, especificaciones) y no explica por qué un producto aparece primero.

### 1.2 Usuarios objetivo

| Perfil | Necesidad |
|---|---|
| Compradores analíticos | Comparaciones objetivas con evidencia, no publicidad |
| Profesionales técnicos | Ponderar especificaciones por sobre el precio |
| Usuarios con presupuesto acotado | Controlar el peso del precio y la disponibilidad |
| Administradores/auditores | Revisar decisiones, procedencia y métricas |

### 1.3 Propuesta de valor

1. Ranking multicriterio ponderable (MAUT + Min-Max).
2. Explicación por criterio y explicación global.
3. Perfiles adaptativos visibles y editables.
4. Datos externos con procedencia, hash y métricas de calidad.
5. Aplicación web, PWA y Android con la misma base de código.
6. Seguridad, observabilidad y despliegue reproducible.

### 1.4 Alcance

**Incluido:** login JWT, roles, catálogo, evaluador, historial, fuente DummyJSON, perfiles adaptativos, PWA, Android, Docker, CI/CD, Terraform, observabilidad y documentación.

**Excluido:** precios reales, scraping de sitios restringidos, refresh tokens, MFA, estudio formal con usuarios, iOS (opcional) y alertas de precio.

---

## 2. Arquitectura

### 2.1 Vista general

```text
Usuario web / PWA / Android
          │ HTTPS
          ▼
Frontend Angular + Ionic (Nginx / Capacitor)
          │ /api + JWT
          ▼
NestJS API Gateway
  ├── Auth + roles + validación + métricas + logs
  ├── Prisma ──► PostgreSQL 16
  └── HTTP ──► FastAPI (MAUT + fuente)
                    └── HTTPS ──► DummyJSON (datos demo)
```

### 2.2 Componentes

| Componente | Tecnología | Responsabilidad |
|---|---|---|
| Frontend | Angular 21, Ionic 9, Capacitor 8, Nginx | SPA/PWA, UI, proxy `/api`, APK |
| Backend | NestJS 11, Prisma 6, class-validator, Swagger | API REST, auth, roles, historial, métricas |
| Motor analítico | Python 3.12, FastAPI 0.165, Pydantic 2 | MAUT, normalización, preparación de fuente |
| Base de datos | PostgreSQL 16 | Usuarios, productos, historial, procedencia |
| Infraestructura | Docker Compose, GHCR, Terraform | Dev, staging, red, volumen, BD |
| CI/CD | GitHub Actions | Tests, seguridad, imágenes, deploy, rollback |

### 2.3 Flujo de evaluación

```text
Angular → POST /api/ranking/evaluate
  → JwtAuthGuard + RolesGuard
  → RankingService
      → productos del catálogo o de una corrida
      → POST http://python-service:8000/evaluate
      → FastAPI calcula MAUT
      → si falla: fallback local NestJS
  → RankingHistory (Prisma, userId)
  → respuesta con ranking, explicación y pesos efectivos
```

### 2.4 Flujo de información web

```text
Angular (ADMIN) → POST /api/sources/demo-products/search
  → NestJS valida DTO, throttle y bandera
  → FastAPI consulta DummyJSON por categoría (timeout 10 s, sin redirecciones)
  → normaliza, valida, deduplica y calcula SHA-256
  → NestJS valida contrato y persiste SourceRun + SourceListing
  → respuesta con run_id, procedencia y métricas
```

### 2.5 Decisiones arquitectónicas (ADR)

| ADR | Decisión |
|---|---|
| ADR-001 | NestJS como gateway y FastAPI como motor analítico |
| ADR-002 | MAUT con normalización Min-Max |
| ADR-003 | JWT, bcrypt, roles `ADMIN`/`USER` y guards |
| ADR-004 | PWA y Android con Capacitor |
| ADR-005 | Ionic real y formularios reactivos |
| ADR-006 | Staging con GHCR, Compose y rollback |
| ADR-007 | Observabilidad y seguridad operativa |

---

## 3. Frontend

### 3.1 Stack

- Angular 21 standalone, TypeScript, Angular Router.
- Ionic 9 (`ion-header`, `ion-toolbar`, `ion-card`, `ion-input`, `ion-select`, `ion-range`, `ion-button`, `ion-badge`, `ion-spinner`, `ion-note`, `ion-app`).
- Capacitor 8 para Android.
- `ReactiveFormsModule` con validadores.
- Signals para autenticación, conectividad y PWA; `zone.js` para la detección de cambios de componentes con estado mutable.
- Vitest para pruebas.

### 3.2 Estructura

```text
frontend/src/app/
├── components/navbar
├── pages/login, evaluator, catalog, history
├── services/auth, api, connectivity, pwa
├── guards/auth.guard
├── interceptors/auth.interceptor
├── config/api.config
├── models/auth, product
└── environments/environment.ts, environment.prod.ts
```

### 3.3 Autenticación en el cliente

- `AuthService` guarda token y usuario, expone Signals `isAuthenticated` e `isAdmin`.
- `authInterceptor` añade `Authorization: Bearer` a `/api` y maneja 401: limpia sesión y redirige a `/login`.
- `authGuard` protege evaluador e historial; el catálogo es público.
- Login con formulario reactivo, validación de email/contraseña y mensajes de error.
- Logout elimina el token; el JWT es stateless y expira.

### 3.4 Formularios reactivos

- Login: `FormBuilder.nonNullable.group` con `required` y `email`.
- Catálogo: `FormControl` para búsqueda.
- Evaluador: `FormGroup` con `sourceQuery`, `contextProfile` y cuatro pesos; `ion-range` con `formControlName`; `patchValue` sin emitir eventos para sincronizar perfiles.
- Botones con `type="button"` para evitar envíos accidentales.

### 3.5 PWA

- `manifest.webmanifest` con iconos 72–512 px y maskable.
- Service worker Angular (`ngsw-config.json`) con precarga del app shell e iconos.
- Caché `freshness` solo para `/api/products` (catálogo público), TTL 1 h.
- No se cachean `/api/auth`, `/api/ranking` ni `/api/sources` para evitar fugas de sesión.
- Instalación desde el navegador y aviso de actualización (`beforeinstallprompt`, `SwUpdate`).
- Banner de conectividad; el catálogo puede verse desde caché, evaluador/historial requieren red.
- El service worker se desactiva en Android para evitar conflictos con el WebView.

### 3.6 Android

- Proyecto nativo en `frontend/android/` generado con Capacitor.
- APK debug: `frontend/android/app/build/outputs/apk/debug/app-debug.apk`.
- URL absoluta `10.0.2.2:3001` para el emulador; `network_security_config.xml` permite HTTP solo a `10.0.2.2`, `localhost` y `127.0.0.1`.
- Verificado en emulador: login, evaluador y navegación.
- Para staging/dispositivo físico: cambiar `environment.prod.ts` a la URL HTTPS y ajustar CORS.

### 3.7 Accesibilidad y responsive

- Etiquetas en `ion-input`/`ion-select`, `aria-label` en sliders.
- `aria-live` y `role="alert"` en mensajes.
- Foco visible, contraste ajustado y tamaños táctiles.
- `min-width: 0` en contenedores y tabla de ranking con scroll horizontal.
- Probado en escritorio y viewport 390×844.
- Limitación: no se hizo auditoría formal con lector de pantalla.

### 3.8 Evidencia visual

![Login web](docs/evidencias/pwa-login.png)

![Evaluador web con combobox de categorías](docs/evidencias/pwa-evaluator.png)

![Ranking web con columna de categoría](docs/evidencias/pwa-ranking.png)

![Catálogo web](docs/evidencias/pwa-catalog.png)

![Historial web](docs/evidencias/pwa-history.png)

![Evaluador Android](docs/evidencias/android-ionic-evaluator.png)

---

## 4. Backend NestJS

### 4.1 Módulos

```text
AppModule
├── CommonModule (RequestContextService)
├── MetricsModule
├── PrismaModule
├── AuthModule (global)
├── ProductsModule
├── RankingModule
├── SourcesModule
└── HealthModule
```

### 4.2 Autenticación y autorización

- `User` persistido: email único, `passwordHash`, rol, `active`.
- `bcryptjs` con 10 rondas.
- JWT firmado con `JWT_SECRET`, expiración `JWT_EXPIRES_IN` (1 h).
- `JwtAuthGuard` verifica firma, expiración y que el usuario siga activo.
- `RolesGuard` + `@Roles`; `@CurrentUser` extrae el payload.
- Roles: `ADMIN` y `USER`.
- Endpoints:
  - `POST /api/auth/login` público, throttle 5/min.
  - `GET /api/auth/me` autenticado.
  - `POST /api/auth/logout` autenticado (cliente elimina token).
  - `POST /api/ranking/evaluate` USER/ADMIN.
  - `GET /api/ranking/history` USER/ADMIN, filtrado por usuario.
  - `sources/*` solo ADMIN, throttle 10/min.
  - `GET /api/metrics` solo ADMIN.
  - Catálogo y health públicos.

### 4.3 Validación y errores

- `ValidationPipe` con `whitelist`, `transform`, `forbidNonWhitelisted`.
- DTOs para login, ranking, búsqueda de fuente.
- `AllExceptionsFilter` devuelve `statusCode`, `message`, `error`, `requestId`, `timestamp` y `path`, sin stack ni SQL.
- Códigos HTTP coherentes: 200/201, 400, 401, 403, 404, 429, 500, 503.

### 4.4 Observabilidad

- `RequestIdMiddleware` acepta o genera `x-request-id`, lo valida y lo guarda en `AsyncLocalStorage`.
- `LoggingInterceptor` registra JSON: timestamp, level, service, requestId, method, path, user, role, status, durationMs.
- `MetricsService` acumula total, errores, tasa, latencia y status counts.
- `GET /api/metrics` (ADMIN) devuelve el snapshot.
- `GET /api/health` verifica NestJS + PostgreSQL + FastAPI.
- FastAPI recibe el mismo `x-request-id` y lo registra.

### 4.5 Seguridad

- Helmet con HSTS, `X-Content-Type-Options`, `X-Frame-Options`, etc. (CSP desactivado para Swagger/Ionic inline).
- CORS configurable por `CORS_ORIGIN`.
- Límite de cuerpo 100 KB.
- `@nestjs/throttler`: 120/min global, 5/min login, 10/min fuente.
- Prisma parametrizado; sin SQL concatenado.
- Secretos por variables; `JWT_SECRET` obligatorio en producción.
- `.env` ignorado; `.env.example` sin valores reales.

### 4.6 Swagger

- `GET /api/docs` con OpenAPI.
- Tags: Health, Metrics, Products, Ranking, Auth, Sources.
- Bearer auth para probar endpoints protegidos.

---

## 5. Servicio Python

### 5.1 Stack

- Python 3.12, FastAPI 0.165, Starlette 1.10, Pydantic 2.
- Uvicorn.
- Pytest, flake8, pip-audit.

### 5.2 Funciones

- `POST /evaluate`: MAUT con normalización Min-Max; devuelve ranking, puntajes, niveles, desglose, explicación, criterios activos/omitidos y pesos efectivos.
- `POST /sources/demo-products/search`: consulta DummyJSON por categoría (`/products/category/{slug}`), valida, normaliza, deduplica, calcula SHA-256 y devuelve métricas.
- `GET /health`: estado del motor.
- `GET /metrics`: métricas internas (total, errores, latencia, status counts).
- Middleware de request ID y logs JSON.

### 5.3 MAUT y normalización

- Precio: `(max - precio) / (max - min)` (menor precio, mayor utilidad).
- Calidad: `(rating - 1) / 4`.
- Stock: Min-Max; si el rango es 0, 1 si hay stock.
- Specs: `score / 100`.
- Pesos por perfil: economia, equilibrado, valoraciones; personalizado usa los pesos del usuario.
- Si un criterio falta en algún producto, se omite para toda la muestra y se renormalizan los pesos.
- Fallback en NestJS si FastAPI no responde.

### 5.4 Evaluación de la adaptación

Dataset fijo de 8 laptops; comparación contra pesos iguales:

| Perfil | Ganador | Top-3 con base | Spearman |
|---|---|---:|---:|
| base 0,25/0,25/0,25/0,25 | Acer Aspire 3 | 3/3 | 1,0000 |
| economia | Acer Aspire 3 | 2/3 | 0,9524 |
| equilibrado | Acer Aspire 3 | 2/3 | 0,9524 |
| valoraciones | MacBook Air M2 | 1/3 | 0,2143 |

- Marca ciega: puntajes idénticos al cambiar solo la marca.
- Datos faltantes: `specs` omitido y pesos renormalizados.
- Script: `python-service/evaluation/compare_profiles.py`.
- Resultados: `python-service/evaluation/results.json`.
- Limitación: no es un estudio con usuarios ni una medida de precisión comercial.

---

## 6. Persistencia

### 6.1 Modelos

- `User`: id, email único, passwordHash, role, active, timestamps.
- `Product`: id, name, category, brand, price, qualityRating, stock, specsScore, imageUrl, description.
- `RankingHistory`: id, userId, pesos, perfil, sourceRunId, ganador, score, explicación, evaluatedAt.
- `SourceRun`: id, source, query, status, métricas, fechas, duration, errorCode.
- `SourceListing`: id, runId, externalId, título, precio, moneda, rating, disponibilidad, specs, URL, hash, retrievedAt.

### 6.2 Relaciones e índices

- `User 1—N RankingHistory` (`SET NULL`).
- `SourceRun 1—N SourceListing` (`CASCADE`).
- `SourceRun 1—N RankingHistory` (`SET NULL`).
- `users.email` único.
- Índices: `ranking_history(user_id, evaluated_at)`, `evaluated_at`, `source_run_id`; `source_listings(run_id, external_id)` único; `source_listings(external_id)`; `source_runs(source, started_at)`.

### 6.3 Migraciones y seed

```text
prisma/migrations/20261121000000_init
prisma/migrations/20261121001000_auth_users
```

- `prisma migrate deploy` en el entrypoint.
- `prisma/baseline.js` detecta una base creada con `db push` y marca la migración base como aplicada sin borrar datos.
- Seed: 5 productos y 2 usuarios desde `ADMIN_*` y `DEMO_USER_*`.
- `seed.js` para Docker/producción; `seed.ts` para desarrollo.

---

## 7. Obtención de información web y ética

- Fuente: DummyJSON Products. La interfaz ofrece un **combobox de categorías** (laptops, smartphones, fragancias, etc.) y el backend consulta `/products/category/{slug}`.
- Consulta manual, una página, máximo 20 registros, timeout 10 s, sin redirecciones, límite de respuesta.
- Se descartan imágenes, descripciones, reseñas y datos de personas.
- Se conservan ID, título, categoría, marca, precio, rating, disponibilidad, specs permitidas, URL, fecha y hash.
- Moneda no declarada: no se inventa; se muestra como unidad de muestra.
- Métricas: recibidos, aceptados, rechazados, duplicados, duración.
- La fuente se desactiva por defecto; el endpoint es ADMIN.
- Mercado Libre no se usa: términos restrictivos y 403 sin autorización; no se eludió.
- Datos sintéticos: se advierte en UI y documentación; no se presentan como mercado real.

---

## 8. DevSecOps y calidad

### 8.1 Pipeline CI

Jobs de `.github/workflows/ci.yml`:

1. `secret-scan`: Gitleaks en todo el historial.
2. `frontend`: npm ci, Prettier, build PWA, Vitest con cobertura, npm audit.
3. `backend`: Prisma generate/validate, oxlint, build, Jest con cobertura, e2e, npm audit.
4. `python-service`: flake8, pytest con cobertura, pip-audit.
5. `terraform`: fmt, init, validate, plan del manifiesto y del módulo Docker.
6. `docker-build`: construye las 3 imágenes y las escanea con Trivy (críticas).
7. `integration`: levanta Docker Compose y ejecuta `scripts/smoke-test.sh`.
8. `quality-gate`: solo pasa si todos los controles pasan.

### 8.2 Quality gates

- Falla si un test falla, el build falla, hay un secreto expuesto, una vulnerabilidad crítica, Terraform inválido, una imagen no construye o el health/smoke test falla.

### 8.3 Resultados

- Gitleaks: sin secretos.
- `pip-audit`: sin vulnerabilidades conocidas tras actualizar FastAPI/Starlette.
- Trivy: backend y Python sin críticas; frontend corregido con `nginx:1.29-alpine` + `apk upgrade`.
- `npm audit --omit=dev --audit-level=critical`: sin críticas en producción.

---

## 9. Contenedores, staging y rollback

### 9.1 Docker

- `frontend/Dockerfile`: multi-stage Node 22 + Nginx 1.29 Alpine.
- `backend/Dockerfile`: multi-stage Node 22, Prisma, usuario de runtime.
- `python-service/Dockerfile`: Python 3.12 slim + Uvicorn.
- `docker-compose.yml`: 4 servicios, health checks, volúmenes, red, logs.
- `docker-compose.staging.yml`: imágenes GHCR, solo frontend publicado, red/volumen internos, logs rotados, `name: pricewatch-staging`.

### 9.2 Staging

- GHCR: `ghcr.io/lurlopez/pricewatch/{backend,frontend,python-service}` con tags SHA + latest.
- `deploy-staging.yml`: build/push, SSH, `scripts/deploy.sh`, health check, rollback.
- `.last_image_tag` guarda la versión estable.
- `rollback-staging.yml` y `scripts/rollback.sh <tag>`.
- `scripts/smoke-test.sh`: health, request ID, frontend, manifest, 401, login admin/user, 403, ranking, historial, métricas.

### 9.3 Evidencia

- Compose de staging probado localmente con imágenes `local/*:test`.
- Smoke test completo aprobado.
- Deploy real pendiente de VPS/dominio y secretos `STAGING_*`.

### 9.4 Terraform

- `infra/`: manifiesto de staging con provider local, variables, outputs y plan.
- `infra/docker-staging/`: provider Docker, red, volumen y PostgreSQL con healthcheck.
- `terraform init/validate/plan` verificado para ambos módulos.
- El estado no se versiona; los lock files sí.

---

## 10. Observabilidad, seguridad y privacidad

### 10.1 Logs

- NestJS: JSON por solicitud con requestId, método, ruta, estado, duración, usuario y rol.
- FastAPI: JSON equivalente con el mismo requestId.
- Sin tokens, contraseñas, cuerpos ni datos sensibles.
- Errores 5xx con stack solo en servidor; cliente recibe mensaje genérico.

### 10.2 Request ID

- `x-request-id` aceptado/generado, validado y devuelto.
- `AsyncLocalStorage` para correlación.
- Propagado a FastAPI.
- Verificado con `corr-test-789` en ambos logs.

### 10.3 Métricas

- `GET /api/metrics` (ADMIN): uptime, total, errores, tasa, latencia media, status counts.
- FastAPI `/metrics` interno.
- Limitación: en memoria y por instancia; producción con Prometheus/OpenTelemetry.

### 10.4 Seguridad

- Modelo STRIDE en `docs/seguridad.md`.
- JWT, bcrypt, roles, guards, usuario activo.
- Helmet, CORS, límite de cuerpo, throttler, validación estricta.
- Secretos por variables/GitHub Secrets; Gitleaks.
- Dependencias: npm audit, pip-audit, Trivy.
- Historial filtrado por usuario; admin ve global.
- Logout stateless documentado.

### 10.5 Privacidad y ética

- Solo correo y hash de contraseña.
- Contexto de adaptación no persistente.
- Datos de fuente minimizados; sin imágenes/reseñas/datos personales.
- Fuente sintética declarada; sin scraping restringido.
- Sin cookies de seguimiento ni analítica de terceros.
- Borrado de cuenta/historial: trabajo futuro.

---

## 11. Pruebas

| Nivel | Herramienta | Cantidad | Evidencia |
|---|---|---:|---|
| Backend unitario | Jest | 31 | `npm run test:cov` |
| Backend e2e | Jest + Supertest | 6 | `npm run test:e2e` |
| Frontend | Vitest | 28 | `npm run test:coverage` |
| Python | pytest | 22 | `pytest --cov=.` |
| Integración | Docker Compose + smoke | 12 comprobaciones | `scripts/smoke-test.sh` |
| Terraform | fmt/validate/plan | 2 módulos | CI y local |
| Imágenes | Trivy | 3 imágenes | CI y local |

Cobertura:

- Python: 90 % total (98 % en main.py y 88 % en sources.py).
- Backend: 49,61 % statements / 50,52 % líneas.
- Frontend: 40,09 % statements / 44,65 % líneas.

Limitación: la cobertura del frontend es moderada porque las plantillas grandes no se testean línea a línea; las funciones críticas (auth, guard, interceptor, formularios) sí tienen pruebas.

---

## 12. Reproducción local

### 12.1 Requisitos

- Docker + Docker Compose.
- Node.js 22+.
- Python 3.12+.
- JDK 21 y Android SDK (solo APK).
- Terraform 1.6+ (solo IaC).

### 12.2 Stack completo

```bash
cd PriceWatch
cp .env.example .env
# editar JWT_SECRET, ADMIN_PASSWORD, DEMO_USER_PASSWORD
docker compose up --build -d
docker compose ps
./scripts/smoke-test.sh
```

- Web: http://localhost:4200
- API: http://localhost:3001/api
- Swagger: http://localhost:3001/api/docs
- FastAPI: http://localhost:8000/health

### 12.3 Usuarios

Se crean desde `.env`:

- Admin: `ADMIN_EMAIL` / `ADMIN_PASSWORD`.
- Usuario: `DEMO_USER_EMAIL` / `DEMO_USER_PASSWORD`.

### 12.4 Android

```bash
cd frontend
npm run build
npx cap sync android
export JAVA_HOME=/usr/lib/jvm/java-21-openjdk-amd64
export ANDROID_HOME=/home/lur/android-sdk
cd android
./gradlew assembleDebug
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

### 12.5 Pruebas

```bash
cd backend && npm run test:cov && npm run test:e2e
cd frontend && npm run test:coverage
cd python-service && pytest -q --cov=.
```

---

## 13. Demo y defensa

### 13.1 Escenarios

1. Login, catálogo, evaluación, historial.
2. Cambio de perfil y ganador.
3. Selecciona una categoría de DummyJSON, consulta, procedencia y métricas.
4. Pipeline CI con tests, Trivy y quality gate.
5. Pruebas y cobertura.
6. 401/403/429, Helmet y Gitleaks/Trivy.
7. Health, logs JSON, request ID y métricas.
8. FastAPI caído → fallback; PostgreSQL caído → 503; recuperación.

### 13.2 Preguntas clave

- ¿Qué problema resuelve y por qué no es un CRUD?
- ¿Por qué NestJS + FastAPI y no un solo backend?
- ¿Cómo se calcula MAUT y cómo se renormalizan los pesos?
- ¿Cómo se autentica/autoriza y dónde se guarda el token?
- ¿Cómo se protege la fuente y qué restricciones éticas existen?
- ¿Cómo se evalúa la adaptación y qué límites tiene?
- ¿Cómo funciona el pipeline y el rollback?
- ¿Qué hace Terraform y qué hace Compose?
- ¿Cómo se correlacionan los logs?
- ¿Qué datos personales se almacenan y cómo se minimizan?

Guion completo: `docs/guia-demo-defensa.md`.

---

## 14. Limitaciones y trabajo futuro

1. DummyJSON es sintético; no hay precios reales ni moneda declarada.
2. Perfiles por reglas, no modelo entrenado; sin estudio con usuarios.
3. Cobertura de frontend moderada; plantillas grandes sin tests de UI.
4. Métricas y throttler en memoria; para varias réplicas usar Redis/Prometheus.
5. Logout stateless; considerar refresh tokens/revocación.
6. Sin MFA ni API de eliminación de cuenta.
7. Staging público pendiente de VPS/dominio y secretos.
8. Figma pendiente de crear el archivo y pegar el enlace.
9. Accesibilidad sin auditoría formal con lector de pantalla.
10. Sin pruebas de carga/estrés.

---

## 15. Inventario y trazabilidad

### 15.1 Archivos clave

- `backend/src/auth/`: login, guards, roles, decoradores.
- `backend/src/common/`: request ID, logs, filtro, contexto.
- `backend/src/metrics/`: métricas y endpoint.
- `backend/prisma/`: schema, migraciones, seed, baseline.
- `frontend/src/app/`: páginas, servicios, guards, interceptor, PWA.
- `frontend/android/`: proyecto nativo.
- `frontend/ngsw-config.json`, `public/manifest.webmanifest`.
- `python-service/main.py`, `sources.py`, `evaluation/`, `tests/`.
- `infra/`, `infra/docker-staging/`.
- `.github/workflows/ci.yml`, `deploy-staging.yml`, `rollback-staging.yml`.
- `scripts/`: deploy, healthcheck, rollback, smoke test.
- `docs/`: arquitectura, modelo, seguridad, observabilidad, despliegue, evaluación, ADRs, prototipo.
- `docker-compose.yml`, `docker-compose.staging.yml`.
- `.env.example`, `.env.staging.example`.
- `LICENSE`, `README.md`, `PLAN-EF.md`.

### 15.2 Commits principales

- `e781f88` docs(ef): plan de cierre y documentación.
- `b609ce1` feat(auth): JWT, roles, guards y login.
- `5d66d26` feat(pwa): PWA instalable y Android.
- `8d6140c` docs(ef): evidencia Android.
- `8995500` feat(frontend): Ionic y formularios reactivos.
- `784a7a4` feat(observability): logs, métricas, throttling y hardening.
- `9b18268` chore(python): ignorar cobertura.
- `8cd0fee` feat(ci): pipeline, staging y Terraform.
- `d2a6857` feat(eval): evaluación adaptativa, prototipo y hardening de imagen.

### 15.3 Pendientes manuales

- Crear el archivo Figma y pegar el enlace público (los frames están en `docs/prototipo/`).
- Configurar VPS/dominio y secretos `STAGING_*`, `GHCR_TOKEN` para el staging público.
- Rotar las contraseñas de `.env` antes de cualquier demo pública.
- Revisar si la asignatura exige un enlace Figma específico y agregarlo al README.

---

## 16. Declaración de uso de IA

Se utilizó ChatGPT/OpenCode como apoyo para interpretar requisitos, proponer la arquitectura, implementar cambios, preparar pruebas y documentar decisiones. La revisión, autoría y responsabilidad del contenido entregado corresponden al estudiante, conforme a las instrucciones de integridad académica de la asignatura. Todo el código incluido debe poder ser explicado por el equipo en la defensa individual.
