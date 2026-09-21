# Guía de contribución — PriceWatch

Este documento describe el flujo de trabajo, las convenciones de ramas y commits y los comandos de verificación del proyecto. Aplican tanto para el desarrollo individual como para futuras contribuciones.

## 1. Requisitos previos

| Herramienta | Versión mínima |
|---|---|
| Node.js | 22 LTS (CI) / 24 (local) |
| npm | 10 |
| Python | 3.12 |
| Docker Engine + Compose | 24 / 2.20 |
| Git | 2.40 |

## 2. Modelo de ramas (GitFlow simplificado)

| Rama | Rol | Origen | Destino |
|---|---|---|---|
| `main` | Estable, entregable. Solo recibe merges desde `development`. | — | — |
| `development` | Integración continua del trabajo. | `main` | `main` |
| `feature/<tema>` | Una funcionalidad o fase. | `development` | `development` |
| `fix/<tema>` | Corrección puntual. | `development` | `development` |
| `docs/<tema>` | Documentación. | `development` | `development` |

Reglas:

1. Nunca se commitea directamente a `main`.
2. Toda rama nace desde `development` actualizado (`git pull origin development`).
3. El merge a `development` se hace por Pull Request (se permite auto-merge en trabajo individual).
4. El paso a `main` se hace por PR `development → main` solo en hitos/entregas.
5. Las ramas se eliminan después del merge.

Nombres previstos para EP1:

| Rama | Contenido |
|---|---|
| `feature/python-service` | Motor MAUT en FastAPI |
| `feature/backend-api` | NestJS + Prisma + PostgreSQL |
| `feature/frontend-ionic` | Ionic + Angular + Capacitor |
| `feature/ci-devsecops` | Pipeline de GitHub Actions |
| `feature/terraform-docs` | Terraform + documentación de arquitectura |

## 3. Commits convencionales

Formato:

```text
<tipo>(<alcance>): <descripción en imperativo, minúscula, sin punto final>
```

Tipos permitidos:

| Tipo | Uso |
|---|---|
| `feat` | Nueva funcionalidad |
| `fix` | Corrección de error |
| `docs` | Documentación |
| `test` | Pruebas |
| `ci` | Pipeline / GitHub Actions |
| `chore` | Mantención (dependencias, configuración) |
| `refactor` | Reestructuración sin cambio de comportamiento |

Alcances sugeridos: `repo`, `python`, `backend`, `frontend`, `infra`, `docs`, `ci`.

Ejemplos reales del proyecto:

```text
chore(repo): añadir definición del proyecto, plantilla de entorno y guía de contribución
feat(python): añadir servicio de evaluación MAUT con FastAPI, validación y pruebas
feat(backend): añadir API NestJS modular con persistencia Prisma, orquestación de ranking y auth
feat(frontend): añadir cliente Ionic Angular multiplataforma con UI de ranking adaptativa
feat(infra): orquestar servicios con Docker Compose, migraciones y healthchecks
ci: añadir pipeline DevSecOps con linting, pruebas, controles de seguridad y builds Docker
docs: añadir documentación de arquitectura, ADRs y manifiesto de staging con Terraform
```

Buenas prácticas:

- Un commit = un cambio lógico. No mezclar refactor con funcionalidad.
- Descripción en español; el tipo y el alcance se mantienen en inglés (palabras clave del estándar Conventional Commits).
- Si el commit cierra una tarea, referenciarla en el cuerpo (`Refs: #12`).

## 4. Flujo de Pull Request

1. Actualizar `development`: `git checkout development && git pull origin development`
2. Crear rama: `git checkout -b feature/<tema>`
3. Desarrollar, verificar localmente (sección 5) y commitear.
4. Subir: `git push -u origin feature/<tema>`
5. Abrir PR hacia `development` con:
   - Título en formato convencional.
   - Qué cambia y por qué.
   - Evidencia de pruebas (salida de comandos o captura).
6. El PR solo se mergea si el pipeline está en verde.
7. Eliminar la rama tras el merge.

## 5. Verificación local por componente

### python-service

```bash
cd python-service
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt -r requirements-dev.txt
flake8 . --count --select=E9,F63,F7,F82 --show-source --statistics
pytest -v
```

### backend

```bash
cd backend
npm ci
npx prisma generate
npm run lint
npm test
npm run build
```

### frontend

```bash
cd frontend
npm ci
npm run lint
npm test -- --watch=false
npm run build
```

### infra

```bash
cd infra
terraform fmt -check
terraform validate
```

## 6. Manejo de secretos

- El archivo `.env` real **nunca** se commitea (está en `.gitignore`).
- Solo se versiona `.env.example`, sin valores reales.
- Las credenciales de CI viven en GitHub: Variables para valores no sensibles (`ENVIRONMENT`, `POSTGRES_DB`, `POSTGRES_USER`) y Secrets para los sensibles (`POSTGRES_PASSWORD`).
- Gitleaks corre en el pipeline y bloquea el PR si detecta credenciales.

Consulta `.env.example` para conocer las variables requeridas y usa `cp .env.example .env` para el entorno local.
