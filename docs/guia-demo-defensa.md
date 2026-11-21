# Guion de demo y defensa — PriceWatch EF

## 1. Preparación (10 minutos antes)

```bash
cd "/home/lur/Lur/EHU/4.URTEA/INGENIERIA WEB AVANZADA/PriceWatch"
sg docker -c 'docker compose up --build -d'
docker compose ps
./scripts/smoke-test.sh
```

- Abrir `http://localhost:4200`.
- Tener a mano:
  - Credenciales admin y usuario de `.env`.
  - `http://localhost:3001/api/docs` (Swagger).
  - GitHub Actions del repositorio.
  - `docs/evidencias/` y `docs/prototipo/index.html`.
- Si se usa Android: emulador encendido, APK instalado y backend local accesible en `10.0.2.2:3001`.

## 2. Escenario 1 — Funcionamiento normal

1. Abrir la app e iniciar sesión como `ADMIN`.
2. Mostrar el evaluador con el perfil Equilibrio.
3. Pulsar **Calcular ranking**.
4. Señalar:
   - Producto ganador y puntaje.
   - Explicación global.
   - Criterios usados/omitidos.
   - Pesos efectivos.
   - Tabla de ranking.
5. Ir a **Historial** y mostrar la evaluación persistida.
6. Ir a **Catálogo** y mostrar la búsqueda.

## 3. Escenario 2 — Capacidad adaptativa

1. En el evaluador, cambiar de **Equilibrio** a **Valoraciones**.
2. Mostrar que cambia el ganador (MacBook Air M2 en el dataset de evaluación; el catálogo local puede variar).
3. Cambiar a **Ahorro** y mostrar que vuelve a priorizar precio.
4. Mover un slider y mostrar que el perfil pasa a **Personalizado** y los pesos se renormalizan.
5. Explicar la prueba de marca ciega y los resultados de `docs/evaluacion-adaptacion.md`.

## 4. Escenario 3 — Información web

1. Iniciar sesión como `ADMIN`.
2. En “Comparar una muestra web”, buscar `laptop` y pulsar **Consultar fuente**.
3. Mostrar:
   - Run ID, fecha, duración.
   - Recibidos/aceptados/rechazados/duplicados.
   - Enlaces de procedencia y hash SHA-256.
4. Evaluar la muestra y mostrar el ranking.
5. Aclarar que DummyJSON es sintético y que la moneda no está declarada.

## 5. Escenario 4 — Pipeline DevSecOps

1. Abrir GitHub Actions.
2. Mostrar el workflow CI con:
   - Frontend, backend, Python, Terraform.
   - Gitleaks, `pip-audit`, Trivy.
   - Integración con Docker Compose y smoke test.
   - Quality gate.
3. Mostrar un job fallido o el quality gate bloqueando (si está disponible).
4. Mostrar `deploy-staging.yml` y `rollback-staging.yml` como código.

## 6. Escenario 5 — Pruebas

1. Mostrar la salida de:
   - `cd backend && npm run test:cov`
   - `cd frontend && npm run test:coverage`
   - `cd python-service && pytest -q --cov=.`
2. Mostrar cobertura de Python (90 %) y frontend (~40 %).
3. Mostrar el smoke test: `./scripts/smoke-test.sh`.
4. Explicar la diferencia entre unitarias, e2e, integración y smoke.

## 7. Escenario 6 — Seguridad

1. Sin token: `curl -i http://localhost:3001/api/ranking/history` → 401.
2. Login como `USER`:
   - `GET /api/sources/demo-products/runs` → 403.
   - `POST /api/ranking/evaluate` → 201.
3. Login como `ADMIN`: `/api/metrics` → 200.
4. Mostrar cabeceras de Helmet:
   ```bash
   curl -I http://localhost:3001/api/health
   ```
5. Mostrar rate limiting: 5 intentos de login por minuto → 429.
6. Mostrar Gitleaks/Trivy en CI y `.env` fuera del repositorio.

## 8. Escenario 7 — Observabilidad

1. `curl -H 'x-request-id: demo-123' http://localhost:3001/api/health`
2. Mostrar `x-request-id` en la respuesta.
3. `sg docker -c 'docker compose logs backend --tail=20'` → log JSON.
4. `sg docker -c 'docker compose logs python-service --tail=20'` → mismo ID en FastAPI.
5. `GET /api/metrics` con admin → total, errores, latencia, status counts.
6. Explicar que no se registran tokens ni contraseñas.

## 9. Escenario 8 — Error controlado

1. Detener FastAPI:
   ```bash
   sg docker -c 'docker compose stop python-service'
   ```
2. Evaluar en la app → `success_fallback` con advertencia, sin 500.
3. Detener PostgreSQL:
   ```bash
   sg docker -c 'docker compose stop database'
   ```
4. `GET /api/health` → 503.
5. Reiniciar:
   ```bash
   sg docker -c 'docker compose start database python-service'
   ```
6. Mostrar recuperación y health OK.

## 10. PWA y Android

- En Chrome, mostrar el botón **Instalar app** y el manifest.
- Activar modo offline (DevTools → Network → Offline) y mostrar el banner; el catálogo cacheado puede verse.
- En Android, abrir la APK, iniciar sesión y mostrar el evaluador.
- Aclarar que la APK local usa `10.0.2.2:3001`; staging usa HTTPS.

## 11. Preguntas de defensa

Preparar respuestas con evidencia del repositorio:

1. ¿Qué problema resuelve PriceWatch y por qué no es un CRUD?
2. ¿Por qué NestJS es el gateway y Python el motor analítico?
3. ¿Cómo se calcula el ranking MAUT y cómo se normalizan los pesos?
4. ¿Qué pasa si falta un criterio en un producto?
5. ¿Cómo se autentica y autoriza un usuario?
6. ¿Dónde se guarda el token y qué riesgos tiene?
7. ¿Cómo se protege la fuente externa y qué restricciones éticas existen?
8. ¿Cómo se garantiza la trazabilidad de los datos de DummyJSON?
9. ¿Qué diferencia hay entre la versión base y los perfiles adaptativos?
10. ¿Cómo se evaluó la adaptación y qué limitaciones tiene?
11. ¿Cómo se construye y despliega la aplicación?
12. ¿Qué hace el pipeline si falla un test, un secreto o una vulnerabilidad crítica?
13. ¿Cómo funciona el rollback?
14. ¿Qué recursos gestiona Terraform y cuáles Docker Compose?
15. ¿Cómo se correlacionan los logs entre NestJS y FastAPI?
16. ¿Qué datos personales se almacenan y cómo se minimizan?
17. ¿Qué partes del código no podrías explicar? (No debería haber ninguna).
18. ¿Qué mejorarías con más tiempo?

## 12. Frases clave para la defensa

- “El ranking no es solo un orden: es una decisión multicriterio explicable.”
- “La adaptación es determinista y visible; no entreno un modelo con datos personales.”
- “La fuente es sintética y lo digo explícitamente; no la presento como precios reales.”
- “El pipeline bloquea si falla un test, hay un secreto expuesto o una vulnerabilidad crítica.”
- “El staging se despliega por tag y tiene health check con rollback.”
- “Los logs comparten `x-request-id` entre NestJS y FastAPI.”
- “Los límites están documentados: no hay estudio con usuarios ni datos de mercado reales.”
