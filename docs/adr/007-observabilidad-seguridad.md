# ADR-007: Observabilidad y seguridad operativa

- **Estado:** Aceptado (EF)
- **Fecha:** 2026-11-21
- **Autor:** Lur Lopez Fraile
- **Contexto:** PriceWatch — Comparador Multicriterio Inteligente (OII436-1 PUCV)

## Contexto

La aplicación tenía health checks, pero no logs estructurados, request ID, métricas, rate limiting ni cabeceras de seguridad. La entrega final exige observabilidad, seguridad integrada y evidencia de controles.

## Decisión

1. **Request ID:** middleware en NestJS que acepta o genera `x-request-id`, lo valida con una expresión regular, lo guarda en `AsyncLocalStorage` y lo devuelve en la respuesta.
2. **Logs JSON:** `LoggingInterceptor` registra método, ruta, estado, duración, usuario y rol; `AllExceptionsFilter` registra errores sin exponer stack al cliente. FastAPI registra una línea JSON equivalente.
3. **Correlación:** NestJS envía `x-request-id` a FastAPI; el mismo ID aparece en logs y respuestas.
4. **Métricas:** `MetricsService` acumula total, errores, tasa, latencia y status counts; `GET /api/metrics` solo para `ADMIN`. FastAPI expone `/metrics` en la red interna.
5. **Seguridad:** Helmet, CORS configurable, límite de cuerpo de 100 KB, `ValidationPipe` estricto, `@nestjs/throttler` (120/min global, 5/min login, 10/min fuente).
6. **Errores seguros:** el filtro devuelve `statusCode`, `message`, `error`, `requestId`, `timestamp` y `path`, sin SQL, credenciales ni trazas.

## Consecuencias

- **Positivas:** diagnóstico rápido, correlación entre servicios, rate limiting, cabeceras de seguridad y evidencia para la demo.
- **Negativas:** las métricas son en memoria y por instancia; se recomienda Prometheus/OpenTelemetry para producción. El rate limiting también es local; usar Redis con varias réplicas.
- **Privacidad:** no se registran cuerpos, tokens ni contraseñas; el usuario/rol se registra como metadato operativo.
- **Evidencia:** 30 pruebas Jest, 6 e2e, 20 pytest; correlación `corr-test-789`; 429 tras 5 intentos de login; cabeceras Helmet verificadas.
