# Plan de cierre — Entrega Final (EF) PriceWatch

**Fecha del análisis:** 21/11/2026  
**Entrega según plan de asignatura:** 23/11/2026  
**Base:** EP1 + EP2 implementadas, tags `v0.1.0-ep1` y `v0.2.0-ep2`  
**Objetivo:** cerrar las brechas obligatorias del enunciado y dejar evidencia para la demo y la defensa individual.

---

## 0. Progreso de implementación

- [x] Paso 1: autenticación JWT, roles, guards, login, migraciones y baseline.
- [x] Paso 2: PWA instalable y APK Android verificado en emulador.
- [x] Paso 3: Ionic real, formularios reactivos y accesibilidad básica.
- [x] Paso 4: observabilidad (logs JSON, request ID, métricas), Helmet, throttling y hardening.
- [x] Paso 5: pipeline DevSecOps, integración, Trivy, staging con deploy/rollback y Terraform Docker.
- [x] Paso 6: evaluación de la adaptación, prototipo navegable y memoria técnica.
- [ ] Paso 7: pegar el enlace público de Figma (requiere cuenta del equipo).
- [ ] Paso 8: configurar VPS/dominio y secretos `STAGING_*` para URL pública.
- [x] Tag/release `v1.0.0-ef` (ver `CHANGELOG.md`).

---

## 1. Estado final

- La implementación está **completa** en código, pruebas, Docker, CI, observabilidad, Terraform y documentación.
- **87 pruebas automatizadas**: 31 Jest + 6 e2e + 28 Vitest + 22 pytest, más el smoke test de integración.
- PWA, APK Android, autenticación JWT, roles, staging compose, rollback y evaluación adaptativa verificados.
- Pendientes **externos al repositorio**: crear el archivo Figma y pegar el enlace; configurar un VPS/dominio y los secretos `STAGING_*` para una URL pública.
- La entrega puede demostrarse en local con Docker Compose y en Android con el emulador.

## 2. Brechas obligatorias (checklist)

> Nota: estas tablas describen el **análisis inicial** del 21/11/2026. El estado final implementado está en la sección 1 y en `docs/MEMORIA-EF.md`.

### 2.1 Frontend multiplataforma — 10 %

| Requisito | Estado | Acción |
|---|---|---|
| Angular + TypeScript + Router | ✅ | Mantener |
| Servicios Angular + RxJS | ✅ | Mantener |
| **Formularios reactivos** | ❌ Hoy usa `ngModel` | Migrar login, búsqueda y sliders a `ReactiveFormsModule` con validadores |
| **Interceptor de autenticación y errores** | ❌ No existe | Crear `auth.interceptor.ts` y `error.interceptor.ts`; registrar con `provideHttpClient(withInterceptors([...]))` |
| **Guards de ruta** | ❌ No existen | Crear `authGuard` y `roleGuard`; proteger `/evaluator` e `/history` |
| **Ionic real** | ⚠️ Solo `provideIonicAngular`; no hay componentes `ion-*` | Usar `IonApp`, `IonHeader`, `IonToolbar`, `IonContent`, `IonCard`, `IonButton`, `IonInput`, `IonRange`, `IonList`, `IonSpinner`, `IonToast`, `IonAlert` en las vistas principales |
| **PWA** | ❌ Sin manifest, iconos, service worker ni offline | `ng add @angular/pwa` o configuración manual; iconos 192/512; `provideServiceWorker`; página offline; aviso de actualización |
| **Android con Capacitor** | ❌ Solo `capacitor.config.ts`; no hay `android/` | `npx cap add android`, `npx cap sync`, compilar APK debug y probar en emulador/dispositivo |
| **Login en la interfaz** | ❌ El endpoint existe, pero el frontend no lo usa | Pantalla `/login`, `AuthService`, logout, token con expiración |
| **Adaptación a conectividad** | ❌ | Banner online/offline; definir qué funciona sin red (catálogo/historial cacheados; evaluador requiere red) |
| **Accesibilidad** | ⚠️ Solo 10 marcas `aria-*` | Revisar teclado, foco, etiquetas, contraste, `aria-live`; pasar Lighthouse/axe |
| **API URL en Android** | ❌ `baseUrl = '/api'` no funciona dentro del WebView | `environments/environment*.ts` con URL absoluta de staging; CORS para `https://localhost` y `capacitor://localhost` |

### 2.2 Backend, API, persistencia y control de acceso — 10 %

| Requisito | Estado | Acción |
|---|---|---|
| NestJS modular, DTO, pipes, Swagger | ✅ | Mantener |
| **JWT real** | ❌ El token es un string decorativo y no se valida | `@nestjs/jwt`, `passport-jwt` o guard propio; expiración, validación de firma, `JWT_SECRET` |
| **Contraseñas seguras** | ❌ Credenciales en variables de entorno, sin hash | Tabla `User`, `bcrypt`, seed de admin y usuario demo |
| **Roles/autorización** | ❌ Todo es público | Roles `ADMIN` y `USER`; `RolesGuard`; `@Roles()`; proteger fuentes, evaluaciones e historial |
| **Guards, interceptores, filtros** | ❌ No hay | `JwtAuthGuard`, `RolesGuard`, `LoggingInterceptor`, `AllExceptionsFilter` |
| **Logout / sesión expirada** | ❌ | Endpoint o lógica de logout en cliente; 401 → borrar token y redirigir a login |
| **Migraciones Prisma** | ❌ Solo `db push` | `prisma migrate dev --name ...`; versionar `prisma/migrations`; `migrate deploy` en entrypoint |
| **Rate limiting / helmet / CORS** | ❌ | `@nestjs/throttler`, `helmet`, CORS restringido, límite de body |
| **Endpoint de salud** | ✅ | Mantener y ampliar a métricas |
| **Transacciones** | ✅ Fuente usa `$transaction` | Revisar historial si se añaden escrituras múltiples |
| **Modelo de datos documentado** | ⚠️ Existe en `docs/`, pero esa carpeta está ignorada por Git | Desbloquear y versionar `docs/` |

### 2.3 Información web y procesamiento — 10 %

| Requisito | Estado | Acción |
|---|---|---|
| Fuente externa, método y límites | ✅ DummyJSON, consulta acotada, flag off | Mantener |
| Validación, limpieza, normalización, deduplicación | ✅ | Mantener |
| Procedencia, fechas, hash, deduplicación | ✅ | Mantener |
| Métricas de calidad | ✅ Conteos y duración | Añadir tabla de resultados en documentación final |
| Manejo de indisponibilidad | ✅ Timeout/errores controlados | Probar en demo |
| Fuente real vs sintética | ⚠️ DummyJSON es sintética | No presentarla como precio real; explicarlo en demo y README |

### 2.4 Capacidad adaptativa o inteligente — 15 %

| Requisito | Estado | Acción |
|---|---|---|
| Adaptación por reglas/perfiles | ✅ `economia`, `equilibrado`, `valoraciones`, `personalizado` | Mantener |
| Variables, decisión y explicación | ✅ Pesos efectivos, criterios usados/omitidos | Mantener |
| Control del usuario | ✅ Sliders/perfiles | Mantener |
| **Evaluación contra versión base** | ❌ No hay experimento | Script con dataset fijo: ranking base (pesos iguales) vs perfiles; medir cambio de ganador, solapamiento top-3, Kendall/Spearman, tiempo; documentar límites |
| **Sesgo y privacidad** | ⚠️ Declarado, sin evidencia | Prueba “marca ciega” (cambiar marca sin cambiar atributos no altera score); análisis de muestra sintética |
| **Utilidad percibida** | ❌ Sin estudio | Opcional: encuesta formativa a 5–10 compañeros; si no, declarar que no se hizo y usar métricas offline |

### 2.5 Pruebas y evaluación — 10 %

| Requisito | Estado | Acción |
|---|---|---|
| Unitarias backend/frontend/Python | ✅ 13 Jest + 11 Vitest + 15 pytest (aprox.) | Mantener |
| **Frontend: guards, formularios, navegación, interceptor** | ❌ | Añadir specs |
| **Backend: auth, roles, guards, filtros** | ❌ | Añadir specs |
| **Integración flujo completo** | ⚠️ E2E con mocks; no flujo real en CI | Job de integración con Docker Compose + smoke HTTP (login → catálogo → ranking → historial) |
| **Cobertura** | ❌ No se reporta | `jest --coverage`, `vitest --coverage`, `pytest --cov`; publicar artefacto |
| **E2E de navegador** | ❌ | Opcional: Playwright (login, evaluador, cambio de perfil, historial) |
| **Accesibilidad automatizada** | ❌ | Opcional: `axe`/Lighthouse en CI o local |
| **Métricas de calidad** | ⚠️ Parciales | Reporte de pruebas, cobertura, tiempos de respuesta, tasa de error |

### 2.6 DevSecOps, contenedores, IaC y despliegue — 12 %

| Requisito | Estado | Acción |
|---|---|---|
| Dockerfiles multi-stage + Compose | ✅ | Mantener |
| Pipeline lint/test/build/audit/Gitleaks | ✅ | Mantener |
| **pip-audit** | ❌ | Añadir al job Python |
| **Trivy / escaneo de imágenes** | ❌ | `aquasecurity/trivy-action` sobre las 3 imágenes |
| **Pruebas de integración en CI** | ❌ | Job con `docker compose up -d` y smoke test |
| **Despliegue automático a staging** | ❌ No existe | Job `deploy` con GHCR + SSH/VPS o Railway/Render; `environment: staging`; health check |
| **Verificación post-despliegue** | ❌ | `scripts/healthcheck.sh` contra `/api/health` y frontend |
| **Rollback** | ❌ | Tags de imagen `sha`; script que vuelva a la versión anterior si falla el health; documentar y probar |
| **Terraform real** | ⚠️ Provider `local` que genera un manifiesto | Ideal: VPS + firewall + DNS + cloud-init; remote state (S3/GCS/Terraform Cloud); separar staging/prod |
| **Variables/Secrets de GitHub** | ❌ El workflow no usa `vars`/`secrets` | Configurar `vars.STAGING_URL`, `secrets.SSH_*`, `secrets.JWT_SECRET`, `secrets.POSTGRES_PASSWORD` |
| **Quality gates** | ⚠️ Parciales | `needs` + `environment` con aprobación; bloquear deploy si falla test/scan/health |
| **Versión identificable** | ⚠️ Tags EP1/EP2 | Tag `v1.0.0-ef` + release con changelog |

### 2.7 Observabilidad, seguridad, privacidad y ética — 8 %

| Requisito | Estado | Acción |
|---|---|---|
| Health NestJS/Python/PostgreSQL | ✅ | Mantener |
| **Logs estructurados JSON** | ❌ Solo `console.log` | Logger JSON con nivel, timestamp, servicio, request ID |
| **Request ID / correlación** | ❌ | Middleware `x-request-id`; propagar a FastAPI; incluirlo en logs y respuesta |
| **Métricas** | ❌ | Interceptor de duración; contadores de requests/errores; endpoint `/api/metrics` o logs agregados |
| **Tiempos de respuesta** | ❌ | Medir por endpoint; mostrar en demo |
| **Threat model** | ❌ | Documento STRIDE básico con mitigaciones |
| **Privacidad/ética** | ⚠️ Parcial en EP2 | Documento: datos tratados, finalidad, permisos, minimización, retención, eliminación |
| **Secretos** | ✅ `.env` ignorado, Gitleaks | Revisar que no haya tokens en logs; `.env.example` sin valores reales |
| **Hardening API** | ❌ | Helmet, throttler, CORS, límites, validación estricta |
| **Accesibilidad** | ⚠️ | Auditoría y correcciones |

### 2.8 Documentación, reproducibilidad y colaboración — 5 %

| Requisito | Estado | Acción |
|---|---|---|
| README extenso | ✅ | Actualizar a EF: staging, Figma, demo, evidencias, licencia |
| **`docs/` versionado** | ❌ `.gitignore` ignora `docs/` | Quitar `docs/` del `.gitignore`; commit de ADR, diagramas y modelos |
| **Figma** | ❌ El README dice que no hay enlace | Crear Figma con 4 pantallas (login, evaluador, catálogo, historial) + móvil; compartir “anyone with link” |
| **Licencia** | ❌ No hay `LICENSE` | Añadir MIT o licencia académica |
| **Responsabilidades** | ⚠️ Solo un autor | Documentar roles; si hay equipo, registrar participación |
| **Tablero/gestión** | ⚠️ No hay evidencia de tablero | GitHub Projects con issues/milestones; enlazar en README |
| **ADRs de cierre** | ❌ Faltan auth, PWA/Android, deploy, observabilidad | Crear ADR-004 a ADR-007 |
| **Instrucciones de despliegue/rollback** | ❌ | `docs/despliegue.md` |
| **Limitaciones y trabajo futuro** | ✅ | Actualizar |

### 2.9 Demo y defensa — 10 %

| Requisito | Estado | Acción |
|---|---|---|
| Staging accesible | ❌ | Bloque 1 |
| 8 escenarios de demo | ⚠️ Parcial | Ensayar y documentar |
| Evidencia de pipeline/tests/seguridad | ⚠️ Parcial | Enlaces y capturas solo como respaldo; la demo debe ser en vivo |
| Defensa individual | ⚠️ | Preparar explicación de arquitectura, flujo, auth, CI, Terraform, Docker, tests, adaptación, límites |

---

## 3. Plan de 48 horas (si la entrega es el 23/11)

> Ajustar si la fecha real es otra. La prioridad es por peso de rúbrica y por dependencias: sin staging no hay demo final; sin auth no hay control de acceso.

### Día 1 — mañana (5–6 h): staging y despliegue

1. Elegir destino:
   - **Recomendado:** VPS pequeño (Hetzner/DigitalOcean) + Docker Compose + Caddy/Nginx + GitHub Actions por SSH.
   - **Alternativa rápida:** Railway/Render con PostgreSQL gestionado; desplegar los 3 Dockerfiles.
   - **Emergencia:** stack local + `ngrok http 4200`; sirve para demo, pero no para deploy automático. No lo presentes como staging real.
2. Crear `docker-compose.staging.yml` y `scripts/deploy.sh`, `scripts/healthcheck.sh`, `scripts/rollback.sh`.
3. Publicar imágenes en GHCR con tags `sha` y `latest`.
4. Job `deploy` en GitHub Actions: build/push → SSH → `docker compose pull && up -d` → health check → rollback si falla.
5. Configurar `vars.STAGING_URL` y los `secrets` necesarios; `environment: staging` con aprobación.
6. Verificar frontend, API, Python y PostgreSQL desde la URL pública.
7. Documentar en `docs/despliegue.md` y actualizar README con la URL.

### Día 1 — tarde (5–7 h): autenticación y autorización

1. Modelo `User` en Prisma (`email`, `passwordHash`, `role`, `createdAt`), migración y seed.
2. `@nestjs/jwt` + `bcrypt`; `JwtAuthGuard`, `RolesGuard`, `@Roles()`, `@Public()` si hace falta.
3. Proteger:
   - `POST /api/sources/demo-products/search` → `ADMIN`.
   - `POST /api/ranking/evaluate` y `GET /api/ranking/history` → `USER`/`ADMIN`.
   - `GET /api/products` y `/api/health` → públicos.
4. Frontend: `/login`, `AuthService`, `authInterceptor`, `errorInterceptor`, `authGuard`, `roleGuard`, logout, expiración.
5. Tests: login válido/inválido, token expirado, 401, 403, guard, interceptor.
6. Swagger con `addBearerAuth` y ejemplos.

### Día 1 — noche (4–5 h): PWA y Android

1. PWA: `ng add @angular/pwa`; manifest, iconos 192/512, `ngsw-config.json`, `provideServiceWorker`, página offline, aviso de actualización.
2. `npx cap add android`, `npx cap sync android`.
3. Configurar `JAVA_HOME=/usr/lib/jvm/java-21-openjdk-amd64`, `ANDROID_HOME=/home/lur/android-sdk`; compilar `./gradlew assembleDebug`.
4. Probar en emulador/dispositivo; capturar evidencia.
5. Configurar `environment.prod.ts` con la URL absoluta de staging y CORS en NestJS.
6. Banner de conectividad.

### Día 2 — mañana (5–6 h): Ionic, formularios y accesibilidad

1. Migrar navbar, tarjetas, botones, inputs, sliders, listas y mensajes a componentes Ionic.
2. Migrar formularios a `ReactiveFormsModule` con validadores.
3. Revisar responsive en móvil/tablet/escritorio; orientación; tamaños táctiles.
4. Auditoría de accesibilidad: teclado, foco, etiquetas, contraste, `aria-live`; corregir lo crítico.
5. Pruebas de formularios, guards, interceptor y navegación.

### Día 2 — tarde (4–5 h): observabilidad, seguridad y pipeline

1. Logger JSON + request ID + interceptor de duración + filtro global de excepciones.
2. Propagación de `x-request-id` a FastAPI; logs JSON en Python.
3. `helmet`, `@nestjs/throttler`, CORS restringido, límites de body.
4. `pip-audit` y Trivy en CI.
5. Job de integración con Docker Compose + smoke test.
6. Documento de threat model, privacidad y ética.

### Día 2 — noche (3–4 h): evaluación, documentación y demo

1. Script de evaluación de adaptación vs base; tabla de resultados y límites.
2. Desbloquear `docs/`, commit de ADRs/diagramas; actualizar README a EF.
3. Figma con 4 pantallas + móvil; enlace en README.
4. `LICENSE`, tablero, responsabilidades, tag `v1.0.0-ef` y release.
5. Ensayo cronometrado de los 8 escenarios y preguntas de defensa.

### Si el tiempo se agota, recortar en este orden

1. Accesibilidad fina y E2E de navegador.
2. Cobertura de pruebas (dejar reporte, no umbral alto).
3. Terraform cloud (dejar VPS documentado y manifiesto).
4. Estudio de usuarios (dejar métricas offline y limitación declarada).

**No recortar:** staging, auth/roles, PWA instalable, APK, Figma, README con enlaces, `docs/` versionado.

---

## 4. Minimum viable final (si solo hay 2 días)

1. **Staging público** + deploy automático + health + rollback documentado.
2. **Login JWT + roles + guards** + endpoints protegidos + tests.
3. **PWA instalable** + **APK debug** + Ionic en las vistas principales.
4. **Figma** + README EF + `docs/` versionado.
5. **Trivy + pip-audit + smoke test** en CI.
6. **Logs JSON + request ID + métricas**.
7. **Evaluación de adaptación** + pruebas de integración.
8. Todo lo demás.

Con esto se cubren las brechas que la rúbrica mira primero y se evita perder puntos por requisitos explícitos ausentes.

---

## 5. Evidencias para la demo (8 escenarios)

1. **Funcionamiento normal:** login, catálogo, evaluación con perfil equilibrado, ranking explicado, historial.
2. **Adaptación:** cambiar de `economia` a `valoraciones`; mostrar ganador distinto, pesos efectivos y criterios omitidos.
3. **Información web:** consultar DummyJSON, mostrar run ID, conteos, hash, URL de procedencia y evaluación de esa corrida.
4. **Pipeline:** ejecución verde en GitHub Actions con lint, tests, análisis, Trivy, build y deploy.
5. **Pruebas:** reporte de Jest/Vitest/pytest y cobertura.
6. **Seguridad:** 401 sin token, 403 con rol `USER` en endpoint `ADMIN`, Gitleaks/Trivy, secretos ocultos.
7. **Observabilidad:** `/api/health`, logs JSON con request ID, métricas y tiempos de respuesta.
8. **Error/indisponibilidad:** detener FastAPI y evaluar → fallback controlado; detener PostgreSQL → health 503; recuperar y mostrar mensaje claro.

Además: instalar la PWA y abrir la APK en Android para demostrar multiplataforma.

---

## 6. Comandos útiles

### PWA

```bash
cd frontend
npx ng add @angular/pwa
npm run build
```

### Android

```bash
cd frontend
export JAVA_HOME=/usr/lib/jvm/java-21-openjdk-amd64
export ANDROID_HOME=/home/lur/android-sdk
npx cap add android
npx cap sync android
cd android
./gradlew assembleDebug
```

APK: `frontend/android/app/build/outputs/apk/debug/app-debug.apk`.

### Auth backend

```bash
cd backend
npm install @nestjs/jwt bcrypt @nestjs/throttler helmet
npx prisma migrate dev --name add_users_and_roles
npm run test
npm run build
```

### Migraciones en producción

```bash
npx prisma migrate deploy
```

### Trivy en CI (ejemplo)

```yaml
- name: Escanear imagen con Trivy
  uses: aquasecurity/trivy-action@0.28.0
  with:
    image-ref: ghcr.io/${{ github.repository }}/pricewatch-backend:${{ github.sha }}
    format: table
    exit-code: '1'
    severity: CRITICAL,HIGH
```

### pip-audit

```bash
cd python-service
pip install pip-audit
pip-audit -r requirements.txt
```

### Smoke test local

```bash
docker compose up --build -d
curl -f http://localhost:3000/api/health
curl -f http://localhost:4200/
curl -f http://localhost:8000/health
```

### Terraform

```bash
cd infra
terraform fmt -check -recursive
terraform init
terraform validate
terraform plan -var-file=staging.tfvars
```

---

## 7. Riesgos y decisiones

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Staging free tier duerme o no tiene URL estable | La demo falla | VPS pequeño o plan pago; health check; fallback local solo como respaldo |
| Android Gradle/JDK incompatible | No hay APK | Usar JDK 21 y SDK 34–36; primera build tarda; probar antes del día 2 |
| `baseUrl='/api'` en Android | La app no conecta | `environment.prod.ts` con URL absoluta; CORS para orígenes Capacitor |
| Token en `localStorage` | XSS | Expiración corta, logout, CSP, documentar; en nativo usar Preferences |
| `docs/` ignorado | ADRs/diagramas no están en el repo | Quitar `docs/` del `.gitignore` y commit |
| Fuente pública sin auth | Abuso/consulta no autorizada | `ADMIN`, throttler, flag off por defecto, CORS restringido |
| DummyJSON sintético | Se confunde con mercado real | Mantener advertencia visible y en README; no usar como precio real |
| Terraform solo local | Puntos de IaC | Provisionar VPS/firewall/DNS o documentar limitación con plan claro |
| Defensa individual | No poder explicar código | Guía de defensa, ensayo y evidencia en repo |

---

## 8. Checklist final de entrega

- [ ] URL de staging funcionando con los 4 servicios.
- [ ] Login JWT, roles, guards, 401/403 demostrables.
- [ ] PWA instalable y APK Android probada.
- [ ] Ionic y formularios reactivos en las vistas principales.
- [ ] CI con lint, tests, auditoría, Trivy, integración, deploy y health.
- [ ] Rollback documentado y probado.
- [ ] Logs JSON, request ID, métricas y health.
- [ ] Evaluación de adaptación vs base con resultados.
- [ ] `docs/` versionado, README EF, ADRs 004–007, licencia.
- [ ] Figma con enlace público.
- [ ] Tag `v1.0.0-ef` y release.
- [ ] Tablero/gestión y responsabilidades.
- [ ] Guion de demo y ensayo de defensa.

---

## 9. Nota sobre el equipo

El enunciado dice “máximo 3 integrantes” en la sección 1 y “máximo cuatro” en la sección 16. Si el proyecto es individual, documenta que asumes todos los roles y que la defensa es individual; si hay compañeros, registra responsabilidades y evita que la defensa dependa de código que no puedan explicar.
