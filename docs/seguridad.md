# Seguridad, privacidad y ética — PriceWatch

## 1. Alcance y activos

| Activo | Riesgo principal | Control |
|---|---|---|
| Credenciales de usuarios | Robo o reutilización | `bcrypt`, HTTPS en staging, rate limiting, no logging de contraseñas |
| Tokens JWT | Uso indebido o expiración | Firma con `JWT_SECRET`, expiración `1h`, validación de usuario activo en cada solicitud |
| Endpoints de fuente | Consumo abusivo o no autorizado | Rol `ADMIN`, throttle 10/min, bandera de fuente desactivada por defecto |
| Historial de evaluaciones | Exposición entre usuarios | Filtro por `userId`; `ADMIN` puede ver el global |
| Base de datos | Acceso no autorizado | Contenedor interno, credenciales por variables, Prisma parametrizado |
| Pipeline y secretos | Exposición de credenciales | GitHub Secrets, `.env` ignorado, Gitleaks, `.env.example` sin valores reales |
| Dependencias | Vulnerabilidades conocidas | `npm audit`, `pip-audit`, Trivy en CI |

## 2. Modelo de amenazas (STRIDE simplificado)

| Amenaza | Ejemplo | Mitigación |
|---|---|---|
| **Spoofing** | Suplantar a un usuario | JWT firmado, contraseña con bcrypt, validación de usuario activo |
| **Tampering** | Modificar pesos o IDs de fuente | DTO con `class-validator`, `ValidationPipe` estricto, validación de corrida en NestJS |
| **Repudiation** | Negar una evaluación | Historial persistido con usuario, perfil, pesos, fecha y corrida |
| **Information disclosure** | Ver historial de otro usuario | Filtro por `userId`, logs sin tokens, errores genéricos |
| **Denial of service** | Abuso de login o fuente | Throttler global y por ruta, timeouts, límite de respuesta de fuente |
| **Elevation of privilege** | Usuario `USER` consultando fuentes | `RolesGuard` + `@Roles(ADMIN)`; prueba 403 verificada |

## 3. Autenticación y autorización

- **Registro/seed:** usuarios creados por seed; no hay registro público en esta versión.
- **Contraseñas:** `bcryptjs` con 10 rondas; nunca se devuelve el hash.
- **JWT:** payload `sub`, `email`, `role`; expiración configurable (`JWT_EXPIRES_IN`, por defecto `1h`).
- **Guard:** `JwtAuthGuard` verifica firma, expiración y que el usuario siga existiendo y activo.
- **Roles:** `ADMIN` y `USER`; `RolesGuard` aplica `@Roles`.
- **Protección:**
  - `POST /api/sources/demo-products/search` → `ADMIN`.
  - `GET /api/sources/demo-products/runs*` → `ADMIN`.
  - `POST /api/ranking/evaluate` → `USER`/`ADMIN`.
  - `GET /api/ranking/history` → `USER`/`ADMIN`, filtrado por usuario.
  - `GET /api/metrics` → `ADMIN`.
  - Catálogo y salud → públicos.
- **Logout:** stateless; el cliente elimina el token. La expiración corta limita la ventana de uso. Se documenta como limitación.

## 4. Protección de la API

- `ValidationPipe` con `whitelist`, `transform` y `forbidNonWhitelisted`.
- `helmet` con cabeceras de seguridad (`X-Content-Type-Options`, `X-Frame-Options`, HSTS, etc.).
- CORS configurable por `CORS_ORIGIN`; en local se permite el origen del frontend y Capacitor.
- Límite de cuerpo de 100 KB para JSON y formularios.
- `@nestjs/throttler`: 120 solicitudes/minuto global, 5/minuto en login y 10/minuto en fuente.
- Timeouts hacia FastAPI (4 s en ranking, 15 s en fuente) y fallback controlado.
- Errores con `requestId`, sin stack, SQL ni credenciales.
- Prisma usa consultas parametrizadas; no se concatena SQL de usuario.

## 5. Secretos y configuración

- `.env` no se versiona; `.env.example` contiene solo valores ficticios.
- `JWT_SECRET` es obligatorio en producción; si falta, el arranque falla.
- GitHub Actions debe usar `secrets` para credenciales y `vars` para configuración no sensible.
- Gitleaks se ejecuta en CI y en local.
- No se imprimen tokens ni contraseñas en logs.

## 6. Dependencias y cadena de suministro

- `npm audit --omit=dev --audit-level=critical` en backend y frontend.
- `pip-audit -r requirements.txt` en Python; se actualizó FastAPI/Starlette para eliminar vulnerabilidades conocidas.
- Trivy escanea las imágenes Docker en CI.
- Gitleaks escanea secretos en todo el historial.
- Las imágenes usan etapas multi-stage y usuarios base de Node/Nginx/Postgres.

## 7. Privacidad y minimización

- Datos personales tratados: correo y contraseña (hash) del usuario; no se solicitan nombre, teléfono ni dirección.
- Datos de la fuente: solo campos normalizados de productos; se descartan imágenes, reseñas y datos de personas.
- El contexto de adaptación (perfil y pesos) describe la comparación, no un perfil personal persistente.
- No se usan cookies de seguimiento ni analítica de terceros.
- Retención: el historial se conserva para trazabilidad; un administrador puede eliminarlo mediante la base de datos. Se documenta como trabajo futuro una API de borrado.
- El usuario puede cambiar el perfil y los pesos antes de evaluar; la explicación muestra los criterios usados y omitidos.

## 8. Ética de la fuente web

- Se usa DummyJSON como API de datos de ejemplo, no como mercado real.
- No se hace scraping de páginas con `robots.txt` restrictivo; se consume una API documentada.
- Se respetan límites de consulta, timeout y tamaño de respuesta.
- Se declara que los precios, valoraciones y disponibilidad son sintéticos y que la moneda no está especificada.
- Mercado Libre no se usa: sus términos restringen comparadores y la consulta sin autorización respondió 403; no se eludió el control.
- La fuente se desactiva por defecto en CI y staging público.

## 9. Accesibilidad

- Etiquetas en formularios y `aria-label` en sliders.
- Mensajes con `aria-live` y `role="alert"`.
- Foco visible, contraste ajustado y navegación por teclado.
- Diseño responsive en móvil, tablet y escritorio.
- Limitación: no se realizó una auditoría formal con lectores de pantalla; se recomienda Lighthouse/axe y una prueba con usuario.

## 10. Limitaciones y trabajo futuro

- Refresh tokens y revocación server-side.
- MFA para administradores.
- Rate limiting distribuido (Redis) si hay varias réplicas.
- API de eliminación de cuenta/historial.
- CSP más estricta en el proxy.
- Auditoría formal de accesibilidad y pruebas de penetración.
