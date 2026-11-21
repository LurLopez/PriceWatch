# ADR-006: Staging con GHCR, Docker Compose y rollback

- **Estado:** Aceptado (EF)
- **Fecha:** 2026-11-21
- **Autor:** Lur Lopez Fraile
- **Contexto:** PriceWatch — Comparador Multicriterio Inteligente (OII436-1 PUCV)

## Contexto

La entrega final exige un ambiente de staging desplegado de forma reproducible y una estrategia de rollback. El proyecto ya tenía Docker Compose de desarrollo y un pipeline de validación, pero no publicaba imágenes ni desplegaba en un servidor.

## Decisión

1. **Imágenes:** publicar `backend`, `frontend` y `python-service` en GHCR con tags `<sha>` y `latest`.
2. **Staging:** `docker-compose.staging.yml` con red interna, volumen persistente, health checks, logs rotados y solo el frontend publicado.
3. **Deploy:** workflow `deploy-staging.yml` que se ejecuta manualmente o al crear un tag `v*`, entra por SSH y ejecuta `scripts/deploy.sh`.
4. **Health check:** `scripts/healthcheck.sh` consulta `/api/health`; si falla, `deploy.sh` vuelve al tag anterior guardado en `.last_image_tag`.
5. **Rollback manual:** workflow `rollback-staging.yml` y `scripts/rollback.sh <tag>`.
6. **Separación de proyectos:** el compose de staging usa `name: pricewatch-staging` para no colisionar con el stack de desarrollo `pricewatch`.

## Consecuencias

- **Positivas:** despliegue reproducible por tag, health check, rollback automático y manual, imágenes versionadas y separación dev/staging.
- **Negativas:** requiere un VPS, Docker, repositorio clonado y secretos `STAGING_*`/`GHCR_TOKEN`; el workflow se omite si `STAGING_ENABLED` no es `true`.
- **Evidencia:** compose de staging probado localmente con imágenes `local/*:test`, smoke test completo aprobado, scripts validados con `bash -n`.

## Alternativas consideradas

- **Deploy manual con `git pull`:** no cumple la reproducibilidad ni el rollback.
- **PaaS sin Docker:** más simple, pero no reutiliza los Dockerfiles ni el compose.
- **Terraform para todo el stack:** se añadió un módulo Docker para red/volumen/PostgreSQL; los contenedores de aplicación se orquestan con Compose por simplicidad y reproducibilidad.
