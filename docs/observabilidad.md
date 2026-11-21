# Observabilidad — PriceWatch

## 1. Objetivo

Permitir que la aplicación sea comprensible durante la ejecución: saber qué solicitud falló, cuánto tardó, qué servicio participó y si la base de datos o el motor analítico están disponibles, sin registrar datos sensibles.

## 2. Logs estructurados

### NestJS

Cada solicitud HTTP genera una línea JSON con:

```json
{
  "timestamp": "2026-11-21T23:30:07.262Z",
  "level": "info",
  "service": "pricewatch-api",
  "message": "request.completed",
  "requestId": "corr-test-789",
  "method": "POST",
  "path": "/api/ranking/evaluate",
  "user": "lur.lopez.f@mail.pucv.cl",
  "role": "ADMIN",
  "status": 201,
  "durationMs": 16
}
```

- `LoggingInterceptor` mide la duración y registra el resultado.
- `AllExceptionsFilter` registra errores y devuelve una respuesta segura con `requestId`, sin stack ni consultas SQL.
- No se registran contraseñas, tokens, cuerpos de solicitud ni datos personales innecesarios.

### FastAPI

`main.py` incluye un middleware que:

- Lee o genera `x-request-id`.
- Devuelve el mismo ID en la respuesta.
- Registra una línea JSON con método, ruta, estado y duración.
- Acumula métricas en memoria.

Ejemplo real verificado:

```json
{"timestamp": "2026-11-21T23:30:07Z", "level": "info", "service": "pricewatch-evaluator", "message": "request.completed", "requestId": "corr-test-789", "method": "POST", "path": "/evaluate", "status": 200, "durationMs": 3.3}
```

## 3. Correlación entre servicios

1. El cliente puede enviar `x-request-id`; si no lo hace, NestJS genera un UUID.
2. `RequestIdMiddleware` guarda el ID en `AsyncLocalStorage` y lo devuelve en la cabecera.
3. `RankingService` y `SourcesService` lo envían a FastAPI en la cabecera.
4. FastAPI lo conserva en sus logs y en la respuesta.
5. El mismo ID aparece en NestJS, FastAPI y en la respuesta al usuario.

Prueba manual:

```bash
curl -X POST http://localhost:3001/api/ranking/evaluate \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $TOKEN" \
  -H 'x-request-id: corr-test-789' \
  -d '{"weights":{"weight_price":0.4,"weight_quality":0.3,"weight_stock":0.1,"weight_specs":0.2}}'

sg docker -c 'docker compose logs backend' | grep corr-test-789
sg docker -c 'docker compose logs python-service' | grep corr-test-789
```

## 4. Métricas

`GET /api/metrics` (solo `ADMIN`) devuelve:

```json
{
  "timestamp": "2026-11-21T23:29:57.923Z",
  "uptimeSeconds": 1,
  "totalRequests": 2,
  "errorRequests": 0,
  "errorRate": 0,
  "averageResponseTimeMs": 59,
  "statusCounts": { "200": 2 }
}
```

FastAPI expone `GET /metrics` en la red interna con la misma idea. No se publica a través de Nginx.

## 5. Salud

- `GET /api/health`: NestJS + PostgreSQL + FastAPI.
- `GET /health`: FastAPI.
- Docker Compose define `healthcheck` para PostgreSQL, Python, backend y frontend.
- El estado `degraded` indica que FastAPI no responde, pero la API sigue operativa con fallback.

## 6. Seguridad de los registros

- No se registran tokens, contraseñas, cookies ni cuerpos completos.
- Los errores 5xx se registran con stack en el servidor, pero el cliente recibe un mensaje genérico.
- Los IDs de solicitud se validan con una expresión regular para evitar inyección en cabeceras.
- Los logs se envían a `stdout`, lo que facilita su recolección por Docker, Loki, CloudWatch u otro agregador.

## 7. Limitaciones

- Las métricas son en memoria y por instancia; un despliegue con varias réplicas debe usar Prometheus/OpenTelemetry o un agregador.
- No se incluye tracing distribuido; la correlación se hace por `x-request-id`.
- El panel de métricas es básico y está pensado para la demostración y la defensa.

## 8. Evidencia

- 30 pruebas Jest y 5 e2e en NestJS.
- 16 pruebas pytest en FastAPI.
- Prueba manual de correlación `corr-test-789` entre NestJS y FastAPI.
- Rate limiting verificado: 5 intentos de login por minuto; el sexto responde `429`.
