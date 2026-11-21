# Changelog — PriceWatch

Todas las versiones relevantes del proyecto. Formato basado en Keep a Changelog.

## [1.0.0-ef] — 2026-11-21

### Añadido

- Autenticación JWT con usuarios persistidos, `bcrypt`, roles `ADMIN`/`USER`, guards e interceptor.
- Login en frontend con formulario reactivo, cierre de sesión y redirección por 401.
- Migraciones Prisma, baseline para bases creadas con `db push` y seed de usuarios.
- Ionic real en navegación, tarjetas, inputs, selects, sliders, badges, spinners y notas.
- Formularios reactivos en login, catálogo y evaluador.
- PWA con manifest, iconos, service worker, instalación, actualización y caché del catálogo.
- Proyecto Android con Capacitor, APK debug y verificación en emulador.
- Observabilidad: logs JSON, `x-request-id`, `AsyncLocalStorage`, métricas y health checks.
- Helmet, CORS configurable, límite de cuerpo, throttling global y por ruta.
- Filtro global de excepciones y respuestas de error seguras con `requestId`.
- Pipeline DevSecOps con cobertura, `pip-audit`, Trivy, integración y quality gate.
- Staging con GHCR, Docker Compose, deploy por SSH, health check y rollback.
- Terraform Docker para red, volumen y PostgreSQL.
- Evaluación adaptativa contra versión base, prueba de marca ciega y datos faltantes.
- Prototipo navegable en HTML, capturas para Figma y guion de demo/defensa.
- Memoria técnica en Markdown y Word (`docs/Memoria_ProyectoFinal_PriceWatch.docx`).
- ADR-003 a ADR-007 y documentación de arquitectura, modelo de datos, seguridad, observabilidad y despliegue.
- Licencia MIT.

### Cambiado

- FastAPI/Starlette actualizados para eliminar vulnerabilidades conocidas.
- Nginx de frontend actualizado a 1.29 Alpine con `apk upgrade` para eliminar CVEs críticas.
- El backend aplica migraciones en el entrypoint en lugar de `db push`.
- El historial de rankings se filtra por usuario; el admin ve el global.
- La configuración de API del frontend usa URL relativa en web y absoluta en Android.
- El service worker se desactiva en Android para evitar conflictos con el WebView.
- Se añadió `zone.js` y detección de cambios explícita para actualizaciones HTTP.

### Corregido

- Login y navegación en Android tras la migración a Ionic.
- Layout móvil con desbordes horizontales en el evaluador.
- Errores de formularios reactivos fuera de un `FormGroup`.
- Fuga de datos entre usuarios en el historial.
- Caché de respuestas autenticadas en la PWA.
- Baseline de migraciones sin pérdida de datos.
- Falso positivo de Gitleaks y lockfile de frontend.

### Seguridad

- Gitleaks en todo el historial.
- `pip-audit` sin vulnerabilidades conocidas.
- Trivy sin vulnerabilidades críticas en las imágenes finales.
- `npm audit --omit=dev --audit-level=critical` sin críticas de producción.
- `.env` y `.env.staging` ignorados; `.env.example` sin secretos.

### Pruebas

- 30 Jest + 6 e2e en backend.
- 27 Vitest en frontend.
- 20 pytest en Python.
- Smoke test de integración con 12 comprobaciones.
- Terraform `fmt`/`validate`/`plan` para dos módulos.

### Pendiente externo

- Crear el archivo Figma y pegar el enlace público.
- Configurar VPS/dominio y secretos `STAGING_*`/`GHCR_TOKEN` para staging público.
- Rotar credenciales antes de una demo pública.

## [0.2.0-ep2] — 2026-10-22

- Fuente DummyJSON, preparación trazable, deduplicación y métricas.
- Perfiles adaptativos y persistencia de corridas.
- Pipeline DevSecOps inicial.

## [0.1.0-ep1] — 2026-09-21

- Arquitectura NestJS + FastAPI + PostgreSQL + Docker Compose.
- Evaluación MAUT, catálogo, historial y CI inicial.
