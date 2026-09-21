# Plan de Desarrollo — Entrega Parcial 1 (EP1)

> **Asignatura:** OII436-1 Ingeniería Web Avanzada (PUCV)  
> **Proyecto:** PriceWatch — Comparador Multicriterio Inteligente  
> **Autor:** Lur Lopez Fraile (`lur.lopez.f@mail.pucv.cl`)  
> **Entrega:** EP1 — Arquitectura, flujo vertical mínimo y pipeline DevSecOps  
> **Cierre:** tag `v0.1.0-ep1` + Release de GitHub  
> **Última actualización:** 21/09/2026

---

## 0. Estado actual del repositorio

| Elemento | Estado |
|---|---|
| Repositorio | `https://github.com/LurLopez/PriceWatch` |
| Ramas | `main` (estable) y `development` (trabajo) |
| `.gitignore` | ✅ Completo y verificado (`.env` ignorado, `.env.example` permitido) |
| `.editorconfig` | ✅ Reglas de estilo por lenguaje |
| `README.md` | ✅ Completo (memoria del proyecto) |
| `.env.example` | ✅ Completo y verificado |
| `CONTRIBUTING.md` | ✅ GitFlow, commits convencionales y verificación local |
| `docs/` | ✅ `PLAN-EP1.md` |
| `backend/`, `frontend/`, `python-service/`, `infra/` | ⬜ Pendientes |

**Referencias usadas (no copiar literal):**
- `.PriceWatch_referencia/` → implementación propia previa. Ojo: su `ProductsService` era en memoria y **no** usaba Prisma, y su health no verificaba dependencias.
- `JembaTech` (repo de compañero recomendado por la profesora) → buenos patrones de Compose (`migrate`), `PrismaService` real y health con verificación de BD.

---

## 1. Decisiones de proyecto

| Decisión | Elección |
|---|---|
| Problema | Los comparadores ordenan por criterio único (precio/patrocinio); falta ponderación personalizada y explicable |
| Usuarios objetivo | Compradores analíticos, profesionales técnicos, usuarios con presupuesto acotado, administradores/auditores |
| Fuente web EP2 | API pública de Mercado Libre Chile (JSON) y scraping ético futuro respetando `robots.txt` |
| Frontend | **Ionic 8 + Angular standalone** (exigido en la pauta) + Capacitor + Nginx |
| Backend | NestJS 11 modular + Prisma + PostgreSQL 16 + Swagger |
| Motor analítico | Python 3.12 + FastAPI, algoritmo MAUT con normalización Min-Max y explicabilidad |
| Autenticación EP1 | Básica, credenciales vía variables de entorno (`ADMIN_EMAIL`, `ADMIN_PASSWORD`), token Bearer |
| Infraestructura | Docker Compose (4 servicios) + Terraform provider `local` que genera `staging-manifest.json` |
| CI/CD | GitHub Actions con lint TS/Python, tests, auditoría de dependencias, Gitleaks y quality gate de Docker |
| Variables/secretos | GitHub Actions Variables (no sensibles) y Secrets (sensibles); `.env.example` versionado |

---

## 2. Mapa de entregables oficiales EP1

| # | Entregable oficial | Fase | Estado |
|---|---|---|---|
| 1 | Definición del proyecto (problema, usuarios, objetivos, alcance, funcionalidades, fuente web, capacidad adaptativa) | 1 | ⬜ |
| 2 | Documentación de arquitectura (contexto, contenedores, despliegue, modelo BD, flujo, ADRs) | 7 | ⬜ |
| 3 | Frontend Ionic + Angular (navegación, componentes, diseño adaptable, Capacitor, prototipo navegable) | 4 | ⬜ |
| 4 | Backend NestJS (módulos, REST, DTO, PostgreSQL, migraciones, auth básica, health) | 3 | ⬜ |
| 5 | Servicio Python (FastAPI, endpoint funcional, comunicación NestJS↔FastAPI, health, errores) | 2 | ⬜ |
| 6 | Contenerización (3 Dockerfiles + PostgreSQL + Docker Compose + comunicación entre contenedores) | 5 | ⬜ |
| 7 | Pipeline DevSecOps (lint TS/Python, tests, análisis estático/dependencias, secretos, builds, imágenes Docker, gates) | 6 | ⬜ |
| 8 | Variables y secretos (GitHub Variables/Secrets, `.env.example`, `.gitignore`) | 1 y 6 | 🟡 parcial |
| 9 | Infraestructura Terraform (provider, variables, outputs, `fmt`, `validate`, `plan`, staging) | 7 | ⬜ |
| 10 | Documentación (README, instalación, Docker, pipeline, variables, enlace Figma) | 1 y 7 | ⬜ |

### Demostración mínima exigida (7 puntos)

1. Ejecución de los componentes mediante Docker Compose.
2. Navegación básica en el frontend.
3. Solicitud desde Angular hacia NestJS.
4. Comunicación desde NestJS hacia FastAPI.
5. Conexión de NestJS con PostgreSQL.
6. Ejecución del pipeline en GitHub Actions.
7. Evidencia de una prueba o control de seguridad que impida continuar ante un error.

---

## 3. Entorno de trabajo

| Herramienta | Versión local | Notas |
|---|---|---|
| Node.js | 24.8 (CI usa 22) | Compatible |
| npm | 11.6 | — |
| Python | 3.12.3 | ✅ |
| Docker Engine | 29.1 + Compose 2.40 | ✅ |
| Git | 2.43 | ✅ |
| Terraform | ❌ no instalado | `sudo snap install terraform --classic` |
| Ionic CLI | ⬜ por instalar | `npm i -g @ionic/cli` |

---

## 4. Fases de desarrollo

### Fase 1 — Fundaciones y Git

**Cubre:** entregables 1 (completo), 8 (parcial), 10 (parcial).

**Archivos:**
- `.gitignore` ✅
- `.editorconfig`
- `.env.example`
- `CONTRIBUTING.md`
- `README.md` (memoria)

**Pasos:**
1. `.editorconfig`: 2 espacios para TS/HTML/JSON, 4 para Python, UTF-8, salto final.
2. `.env.example`:
   ```env
   NODE_ENV=development
   ENVIRONMENT=staging
   POSTGRES_DB=pricewatch_db
   POSTGRES_USER=pricewatch_admin
   POSTGRES_PASSWORD=change_me
   POSTGRES_PORT=5432
   DATABASE_URL=postgresql://pricewatch_admin:change_me@database:5432/pricewatch_db?schema=public
   PORT=3000
   BACKEND_PORT=3000
   PYTHON_SERVICE_URL=http://python-service:8000
   PYTHON_PORT=8000
   FRONTEND_PORT=4200
   ADMIN_EMAIL=lur.lopez.f@mail.pucv.cl
   ADMIN_PASSWORD=change_me_too
   ```
3. `CONTRIBUTING.md`: GitFlow (`main`/`development`/`feature/*`), commits convencionales (`feat:`, `fix:`, `docs:`, `test:`, `ci:`, `chore:`, `refactor:`), flujo de PR `feature → development → main`, comandos de test por componente.
4. `README.md` con las 7 definiciones del entregable 1 + arquitectura ASCII + tecnologías + instalación (Docker y manual) + tabla de endpoints + tests + pipeline + variables + sección Figma.

**Verificación:**
```bash
git check-ignore .env            # debe devolver .gitignore (ignorado)
git check-ignore .env.example    # no debe devolver nada
```
**Commit:** `chore(repo): add project definition, env template and contribution guide`

---

### Fase 2 — `python-service/` (motor MAUT)

**Cubre:** entregable 5 (health + endpoint + errores). Base para demo punto 4.

**Archivos:**
```
python-service/
├── main.py
├── requirements.txt
├── requirements-dev.txt
├── pytest.ini
├── .env.example
├── .dockerignore
├── Dockerfile
└── tests/test_evaluator.py
```

**Especificación funcional:**
- `GET /health` → `{status: "ok", service: "pricewatch-evaluator", version, algorithm}`
- `POST /evaluate` → recibe `{weights, products}` y devuelve ranking explicado.
- Validaciones: productos vacíos → **400**; suma de pesos `<= 0` → **400**. Si la suma ≠ 1, normalizar.
- Normalización:
  - Precio (costo, invertido): `(max - price) / (max - min)`; si rango 0 → `1.0`.
  - Stock (beneficio): `(stock - min) / (max - min)`; si rango 0 → `1.0` si stock > 0.
  - Calidad (escala fija 1–5): `(quality_rating - 1) / 4`.
  - Specs (escala fija 0–100): `specs_score / 100`.
- Score: `100 * Σ(wᵢ · normᵢ)`, redondeado a 2 decimales.
- Nivel: `>=80` Altamente Recomendado, `>=60` Recomendado, `>=40` Aceptable, resto No Favorable.
- Salida por producto: `rank_position`, `final_score`, `level`, `breakdown` (normalizados y aportes ponderados), `reasons`.
- Salida global: `status`, `total_products_evaluated`, `top_recommended_product_id`, `global_explanation`, `warnings` (stock 0 o crítico).

**Comandos:**
```bash
cd python-service
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt -r requirements-dev.txt
pytest -v
flake8 . --count --select=E9,F63,F7,F82 --show-source --statistics
uvicorn main:app --port 8000 --reload
curl http://localhost:8000/health
```

**DoD:** 4+ tests pasan; `/health` responde; `/evaluate` con payload inválido devuelve 400; `flake8` limpio.

**Commit:** `feat(python): add MAUT evaluation service with FastAPI, validation and tests`

---

### Fase 3 — `backend/` NestJS + Prisma + PostgreSQL

**Cubre:** entregable 4. Habilita demo puntos 3, 4 y 5.

**Pasos:**
1. Crear proyecto: `npx @nestjs/cli new backend --package-manager npm --strict`
2. Instalar:
   ```bash
   npm i @nestjs/config @nestjs/axios @nestjs/swagger class-validator class-transformer @prisma/client
   npm i -D prisma ts-node
   npx prisma init --datasource-provider postgresql
   ```
3. **Prisma real** (`prisma/schema.prisma`):
   - `Product`: `id` uuid, `name`, `category`, `brand`, `price Float`, `qualityRating Float @map("quality_rating")`, `stock Int`, `specsScore Float @map("specs_score")`, `imageUrl?`, `description?`, timestamps, `@@map("products")`.
   - `RankingHistory`: id uuid, 4 pesos, `topProductId`, `topProductName`, `topProductScore`, `explanation`, `evaluatedAt` (index), `@@map("ranking_history")`.
4. `PrismaService` (extiende `PrismaClient`, `$connect` en `onModuleInit`, `$disconnect` en `onModuleDestroy`) + `PrismaModule` `@Global`.
5. Migración y seed:
   ```bash
   docker run -d --name pw-db -e POSTGRES_PASSWORD=pricewatch -e POSTGRES_USER=pricewatch_admin -e POSTGRES_DB=pricewatch_db -p 5432:5432 postgres:16-alpine
   npx prisma migrate dev --name init
   npx prisma db seed   # prisma/seed.ts con ~10 productos de 2-3 categorías
   ```
6. Módulos:
   - `HealthModule` → `GET /api/health`: `SELECT 1` a Postgres (503 si falla) + ping a FastAPI.
   - `ProductsModule` → `GET /api/products?category=` y `GET /api/products/:id` con **PrismaService**.
   - `RankingModule` → `POST /api/ranking/evaluate`: DTO validado (`weights` anidado, 0–1), lee productos de Postgres, llama a `${PYTHON_SERVICE_URL}/evaluate` con timeout 4000 ms, persiste en `RankingHistory` y ante fallo de FastAPI aplica **degradación elegante** (`status: "success_fallback"`). `GET /api/ranking/history`.
   - `AuthModule` → `POST /api/auth/login`: valida contra `ConfigService` (`ADMIN_EMAIL`/`ADMIN_PASSWORD`), 401 controlado, retorna `accessToken` + `tokenType` + `expiresIn` + `user`.
7. `main.ts`: prefijo global `api`, `ValidationPipe({whitelist, transform, forbidNonWhitelisted})`, CORS, Swagger en `/api/docs`.
8. Tests Jest: `health.controller.spec.ts`, `products.service.spec.ts` (Prisma mockeado), `ranking.service.spec.ts` (HttpService mockeado: éxito + fallback).
9. `.env.example`, `.dockerignore` y `Dockerfile` multi-stage con etapas `build` y `runtime` (runtime copia `dist`, `prisma`, `node_modules/.prisma` y `node_modules/@prisma`).

**Verificación:**
```bash
npm run lint && npm test && npm run build
npm run start:dev
curl localhost:3000/api/health
curl localhost:3000/api/products
```

**DoD:** productos salen de Postgres real (no en memoria); `/api/docs` carga; tests verdes; login devuelve token y credenciales malas dan 401.

**Commit:** `feat(backend): add modular NestJS API with Prisma persistence, ranking orchestration and auth`

---

### Fase 4 — `frontend/` Ionic + Angular

**Cubre:** entregable 3. Habilita demo puntos 2 y 3.

**Pasos:**
1. Scaffold: `npm i -g @ionic/cli` y `ionic start frontend tabs --type=angular-standalone --no-git`.
2. Verifica que `main.ts` use `provideIonicAngular()` desde `@ionic/angular/standalone` y `provideHttpClient()`, e importa los CSS de Ionic en `styles.css`:
   ```css
   @import '@ionic/angular/css/core.css';
   @import '@ionic/angular/css/normalize.css';
   @import '@ionic/angular/css/structure.css';
   @import '@ionic/angular/css/typography.css';
   ```
3. Páginas/componentes:
   - `catalog`: catálogo en `ion-card` con precio, rating, stock, specs.
   - `evaluator`: 4 `ion-range` (Precio, Calidad, Stock, Specs) con valor visible, botón evaluar, ranking ordenado con `ion-badge` de nivel, desglose y tarjeta del ganador con `global_explanation` y warnings.
   - `history`: `GET /api/ranking/history`.
4. `core/models/product.model.ts`, `core/models/ranking.model.ts`; `core/services/api.service.ts` con `HttpClient` sobre `/api` y **catálogo local de respaldo** si la API no responde.
5. Dev: `proxy.conf.json` (`/api` → `http://localhost:3000`) registrado en `angular.json`.
6. Capacitor: `npm i @capacitor/core @capacitor/android`, `npm i -D @capacitor/cli`, `npx cap init`, `npx cap add android`, `capacitor.config.ts` con `webDir: "www"`.
7. PWA opcional: `ng add @angular/pwa` (manifest + service worker).
8. `nginx.conf`: fallback SPA + `location /api/ { proxy_pass http://backend:3000; }`.
9. `Dockerfile` multi-stage: build con Node 22 → `nginx:1.27-alpine` copiando `www/browser` (verificar ruta real de build).
10. Test de `ApiService` con `HttpTestingController`; `npm test -- --watch=false`.

**DoD:** `npm start` navega las pestañas; el evaluador mueve sliders y muestra el ranking; `npm run build` genera `www/`.

**Commit:** `feat(frontend): add Ionic Angular multiplatform client with adaptive ranking UI`

---

### Fase 5 — Docker Compose

**Cubre:** entregable 6 y demo punto 1.

**Servicios:**
| Servicio | Imagen/Build | Puerto | Depende de |
|---|---|---|---|
| `database` | `postgres:16-alpine` + healthcheck + volumen `postgres_data` | 5432 | — |
| `python-service` | build `./python-service` | 8000 | — |
| `migrate` | build `./backend` target `build`, `npx prisma migrate deploy`, `restart: 'no'` | — | database healthy |
| `backend` | build `./backend` | 3000 | migrate completed, python-service started |
| `frontend` | build `./frontend` | 4200:80 | backend |

**Verificación end-to-end:**
```bash
cp .env.example .env
docker compose up --build -d
docker compose ps
curl localhost:8000/health
curl localhost:3000/api/health
curl localhost:3000/api/products
curl -X POST localhost:3000/api/ranking/evaluate \
  -H 'Content-Type: application/json' \
  -d '{"weights":{"weight_price":0.5,"weight_quality":0.2,"weight_stock":0.1,"weight_specs":0.2}}'
docker compose exec database psql -U pricewatch_admin -d pricewatch_db \
  -c 'select count(*) from products; select count(*) from ranking_history;'
# Fallo controlado:
docker compose stop python-service
# repetir POST → debe responder success_fallback (no 500)
docker compose start python-service
docker compose down
```

**DoD:** 4 servicios arriba; datos persistidos en Postgres; fallback probado.

**Commit:** `feat(infra): orchestrate services with Docker Compose, migrations and healthchecks`

---

### Fase 6 — Pipeline DevSecOps (`.github/workflows/ci.yml`)

**Cubre:** entregables 7 y 8. Demo puntos 6 y 7.

**Jobs y pasos:**
1. `frontend`: `npm ci` → `npm run lint` (con `angular-eslint`) → `npm test -- --watch=false` → `npm run build` → `npm audit --omit=dev --audit-level=critical`.
2. `backend`: `npm ci` → `npx prisma generate` → `npm run lint` → `npm test` → `npm run build` → `npm audit`.
3. `python-service`: `pip install -r requirements.txt -r requirements-dev.txt` → `flake8` → `pytest -v`.
4. `terraform`: `terraform fmt -check` → `init` → `validate` → `plan`.
5. `secrets-scanning`: `actions/checkout` con `fetch-depth: 0` + `gitleaks/gitleaks-action@v2`.
6. `docker-build` (`needs: [los 5 anteriores]`): construye las 3 imágenes → **quality gate**.

**Variables y secretos:**
- GitHub → Settings → Variables: `ENVIRONMENT=staging`, `POSTGRES_DB=pricewatch_db`, `POSTGRES_USER=pricewatch_admin`.
- GitHub → Settings → Secrets: `POSTGRES_PASSWORD=<valor real>`.
- El workflow los consume con `${{ vars.X }}` y `${{ secrets.Y }}`.
- `.env.example` versionado y `.env` ignorado.

**Evidencia de fallo controlado:** romper un test en una rama temporal → el run se pone en rojo y `docker-build` queda **skipped** → captura → revertir.

**DoD:** pipeline en verde en `development` y `main`; evidencia del run en rojo guardada.

**Commit:** `ci: add DevSecOps pipeline with linting, tests, security gates and docker builds`

---

### Fase 7 — Terraform, documentación y cierre

**Cubre:** entregables 2, 9, 10 y la entrega formal.

**Terraform (`infra/`):**
- `main.tf`: `required_version >= 1.6`, provider `hashicorp/local ~> 2.5`, recurso `local_file.staging_manifest` que genera `generated/staging-manifest.json` con servicios, puertos y límites.
- `variables.tf`, `outputs.tf`, `terraform.tfvars.example`, `README.md` (descripción del ambiente staging).
```bash
cd infra
terraform fmt
terraform init
terraform validate
terraform plan
```

**Documentación (`docs/`):** usar Mermaid.
- `diagrama-contexto.md`
- `diagrama-contenedores.md`
- `diagrama-despliegue.md`
- `modelo-datos-inicial.md` (ER + migración)
- `arquitectura.md` (flujo end-to-end y decisiones)
- `adr/001-gateway-nestjs-centralizado.md`
- `adr/002-motor-maut-fastapi.md`
- (opcional) `adr/003-frontend-ionic-capacitor.md`

**README final:** enlace al prototipo Figma, variables requeridas, descripción del pipeline, evidencias e instrucciones completas.

**Cierre:**
```bash
git checkout development
git merge --no-ff feature/...    # todas las ramas
git push origin development
# PR development -> main y merge
git tag -a v0.1.0-ep1 -m "Entrega Parcial 1 — Arquitectura y Pipeline DevSecOps"
git push origin main --tags
```
- Crear **Release de GitHub** con notas y evidencias.
- Ensayar la demo de los 7 puntos.

**Commit:** `docs: add architecture documentation, ADRs and terraform staging manifest`

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

## 6. Flujo end-to-end

```text
Navegador / PWA / Android (Capacitor)
        │  Angular + Ionic (4200 / Nginx :80)
        │  GET /api/products · POST /api/ranking/evaluate
        ▼
NestJS API Gateway (3000)
  ├── Prisma ORM ──────► PostgreSQL 16 (5432)
  └── HTTP+timeout 4s ─► FastAPI (8000) ── normalización Min-Max + MAUT + explicación
```

---

## 7. Git: ramas y commits

| Rama | Contenido | Commit principal |
|---|---|---|
| `development` | Base e integración | `chore(repo): ...` |
| `feature/python-service` | Motor MAUT | `feat(python): ...` |
| `feature/backend-api` | NestJS + Prisma | `feat(backend): ...` |
| `feature/frontend-ionic` | Ionic + Capacitor | `feat(frontend): ...` |
| `feature/ci-devsecops` | Pipeline | `ci: ...` |
| `feature/terraform-docs` | Terraform + docs | `docs: ...` |

Flujo por fase: `git checkout -b feature/X` → commits → push → PR a `development` → merge. Al final: PR `development → main`, tag `v0.1.0-ep1`.

---

## 8. Guion de la demo oficial (7 puntos)

1. **Docker Compose:** `docker compose up --build -d` y `docker compose ps` (5 servicios, incluido `migrate` exitoso).
2. **Navegación:** abrir `http://localhost:4200`, recorrer las pestañas Catálogo / Evaluador / Historial.
3. **Angular → NestJS:** mover sliders, evaluar y mostrar en Network el `POST /api/ranking/evaluate`.
4. **NestJS → FastAPI:** mostrar logs del backend y `docker compose logs python-service`.
5. **NestJS → PostgreSQL:** `psql` mostrando `products` y `ranking_history` creciendo.
6. **Pipeline:** pestaña Actions con el workflow en verde.
7. **Fallo controlado:** `docker compose stop python-service` → evaluación responde `success_fallback`; y mostrar en Actions el run rojo que bloqueó `docker-build`.

---

## 9. Riesgos y contingencias

| Riesgo | Mitigación |
|---|---|
| Tiempo insuficiente | Priorizar Fases 2→3→4→5 (demo) sobre 6→7 |
| Puertos ocupados (5432/3000/4200/8000) | `docker compose down` y verificar `ss -ltnp` |
| Prisma falla en Alpine (openssl) | Usar `node:22-alpine` reciente o `node:22-slim` |
| `npm audit` estricto rompe CI | Mantener `--audit-level=critical` y actualizar dependencias |
| Ionic CLI scaffoldea versión incompatible | Fijar Angular/Ionic compatibles entre sí; si falla, añadir `@ionic/angular` + CSS a un `ng new` |
| Gitleaks detecta `.env` | Revisar historial; jamás commitear `.env` |
| Terraform no instalado | `snap install terraform --classic`; el CI lo ejecuta igual |

---

## 10. Bitácora de avance

- [x] Repositorio creado y `.gitignore`
- [x] Fase 1 — Fundaciones y Git
- [ ] Fase 2 — python-service
- [ ] Fase 3 — backend
- [ ] Fase 4 — frontend
- [ ] Fase 5 — Docker Compose
- [ ] Fase 6 — CI DevSecOps
- [ ] Fase 7 — Terraform, docs y cierre
- [ ] Tag `v0.1.0-ep1` + Release
- [ ] Demo de 7 puntos ensayada
