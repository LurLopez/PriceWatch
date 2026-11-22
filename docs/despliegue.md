# Despliegue y rollback — PriceWatch

## 1. Arquitectura de staging

```text
Internet
   │ HTTPS (Caddy/Nginx del host o balanceador)
   ▼
frontend (Nginx :80) ──► backend (NestJS :3000) ──► PostgreSQL :5432
                              │
                              └──► python-service (FastAPI :8000)
```

- Solo el frontend publica un puerto al host (`FRONTEND_PORT`, por defecto 80).
- PostgreSQL, NestJS y FastAPI quedan en la red interna `pricewatch_staging_network`.
- Las imágenes se publican en GHCR y se despliegan por tag SHA.
- El frontend Nginx hace proxy de `/api` al backend.

## 2. Prerrequisitos del servidor

- VPS Linux con Docker Engine y Docker Compose v2.
- Repositorio clonado en `STAGING_PATH` (por ejemplo `/opt/pricewatch`).
- DNS `staging.tu-dominio.cl` apuntando al servidor.
- HTTPS: se recomienda Caddy como reverse proxy del puerto 80/443 hacia el frontend, o un certificado gestionado por el proveedor.
- Usuario con permiso para ejecutar Docker.

## 3. Variables de GitHub

Configurar en **Settings → Secrets and variables → Actions**:

| Tipo | Nombre | Ejemplo | Uso |
|---|---|---|---|
| Variable | `STAGING_ENABLED` | `true` | Habilita el job de deploy |
| Variable | `STAGING_URL` | `https://staging.tu-dominio.cl` | URL pública y environment |
| Variable | `STAGING_HOST` | `203.0.113.10` | Host SSH |
| Variable | `STAGING_USER` | `deploy` | Usuario SSH |
| Variable | `STAGING_PORT` | `22` | Puerto SSH |
| Variable | `STAGING_PATH` | `/opt/pricewatch` | Ruta del repo en el servidor |
| Secret | `STAGING_SSH_KEY` | clave privada | Acceso SSH |
| Secret | `GHCR_TOKEN` | PAT `read:packages` | Pull de imágenes privadas |

Si el paquete de GHCR es público, `GHCR_TOKEN` puede omitirse.

## 4. Archivo `.env.staging` en el servidor

```bash
cp .env.staging.example .env.staging
# editar contraseñas, JWT_SECRET, dominio y CORS_ORIGIN
chmod 600 .env.staging
```

Valores importantes:

- `POSTGRES_PASSWORD`, `ADMIN_PASSWORD`, `DEMO_USER_PASSWORD`: contraseñas reales.
- `JWT_SECRET`: mínimo 32 caracteres aleatorios (`openssl rand -hex 32`).
- `CORS_ORIGIN`: dominio público + orígenes de Capacitor (`https://localhost`, `capacitor://localhost`).
- `STAGING_URL`: URL usada por el health check.
- `DEMO_PRODUCTS_SOURCE_ENABLED=false` salvo que la ruta esté protegida y se haya revisado la fuente.

## 5. Flujo automático

1. Se ejecuta `Deploy staging` manualmente o al crear un tag `v*`.
2. `build-push` construye y publica las imágenes con tags `<sha>` y `latest` en GHCR.
3. `deploy` entra por SSH, actualiza el repositorio, hace login en GHCR y ejecuta `scripts/deploy.sh`.
4. `deploy.sh`:
   - Lee `.last_image_tag` para conocer la versión anterior.
   - Hace `docker compose pull` y `up -d`.
   - Ejecuta `scripts/healthcheck.sh` contra `/api/health`.
   - Si el health check falla, vuelve a la imagen anterior y reintenta el health check.
   - Si todo va bien, guarda el nuevo tag en `.last_image_tag`.

## 6. Despliegue manual en el servidor

```bash
cd /opt/pricewatch
export IMAGE_PREFIX=ghcr.io/lurlopez/pricewatch
export IMAGE_TAG=<sha-o-tag>
./scripts/deploy.sh
```

Rollback manual:

```bash
./scripts/rollback.sh <tag-anterior>
```

o desde GitHub Actions con el workflow **Rollback staging**.

## 7. Prueba local del compose de staging

```bash
docker build -t ghcr.io/lurlopez/pricewatch/backend:local ./backend
docker build -t ghcr.io/lurlopez/pricewatch/frontend:local ./frontend
docker build -t ghcr.io/lurlopez/pricewatch/python-service:local ./python-service
cp .env.staging.example .env.staging
# ajustar STAGING_URL=http://localhost y FRONTEND_PORT=8080
IMAGE_PREFIX=ghcr.io/lurlopez/pricewatch IMAGE_TAG=local \
  docker compose --env-file .env.staging -f docker-compose.staging.yml up -d
curl http://localhost:8080/api/health
```

## 8. Alternativa de emergencia para la demo

Si no hay VPS ni dominio, se puede exponer el stack local con un túnel:

```bash
ngrok http 4200
```

Eso entrega una URL pública temporal. **No reemplaza el staging automatizado**: el túnel depende de que el equipo esté encendido y no se despliega desde GitHub Actions. Se documenta solo como respaldo para la demostración.

## 9. Limitaciones

- El servidor debe tener el repositorio clonado y acceso a GHCR.
- El workflow de deploy se omite si `STAGING_ENABLED` no es `true`.
- No se incluyen credenciales reales en el repositorio.
- El TLS del dominio lo gestiona el proxy del host (Caddy/Nginx) o el proveedor cloud.
- Las métricas son en memoria; para producción se recomienda Prometheus/OpenTelemetry.

## 10. Evidencia

- `.github/workflows/deploy-staging.yml`
- `.github/workflows/rollback-staging.yml`
- `docker-compose.staging.yml`
- `scripts/deploy.sh`, `scripts/healthcheck.sh`, `scripts/rollback.sh`
- `scripts/smoke-test.sh` y job `integration` del CI

## 11. Nota de entorno (GitHub Actions)

En el repositorio de entrega, los runs de GitHub Actions aparecieron con **0 pasos** y fallo inmediato, incluso para jobs que no dependen de secretos. Eso ocurre antes de que un runner ejecute el workflow; no es un error de los tests ni del YAML.

Verificaciones realizadas:

- El YAML se parseó correctamente y los workflows están en `main`.
- Todos los jobs se ejecutaron manualmente en local: build, tests, e2e, cobertura, Trivy, Terraform, Docker Compose y smoke test.
- El fallo remoto es de configuración/cuenta, no del código.

Revisar en GitHub:

1. **Settings → Actions → General → Actions permissions**: permitir acciones.
2. **Billing & plans → Actions**: límite de minutos o método de pago.
3. Re-ejecutar el workflow con **Run workflow**.

Mientras tanto, la evidencia local y los scripts (`scripts/smoke-test.sh`, `scripts/deploy.sh`) permiten demostrar el pipeline y el despliegue.
