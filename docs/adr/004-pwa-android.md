# ADR-004: PWA y aplicación Android con Capacitor

- **Estado:** Aceptado (EF)
- **Fecha:** 2026-11-21
- **Autor:** Lur Lopez Fraile
- **Contexto:** PriceWatch — Comparador Multicriterio Inteligente (OII436-1 PUCV)

## Contexto

La entrega final exige que la aplicación se ejecute en navegador, como PWA instalable y como aplicación Android generada con Capacitor. La base Angular/Ionic ya funcionaba en navegador, pero no tenía manifest, service worker ni proyecto nativo.

## Decisión

1. **PWA**
   - Manifest con nombre, iconos (incluido maskable), `display: standalone`, `start_url` y `theme_color`.
   - Service worker de Angular generado desde `ngsw-config.json`.
   - Precarga del app shell e iconos; caché `freshness` solo para el catálogo público.
   - No se cachean respuestas autenticadas (`/api/auth`, `/api/ranking`, `/api/sources`) para evitar fugas de sesión.
   - Instalación desde el navegador y aviso de actualización mediante `beforeinstallprompt` y `SwUpdate`.
   - Banner de conectividad y mensaje de funcionalidad limitada sin red.

2. **Android**
   - Proyecto nativo generado con `npx cap add android`.
   - `webDir` apunta a `dist/frontend/browser`.
   - URL de API absoluta en nativo mediante `environment.apiBaseUrlNative`; en web se mantiene `/api` con proxy Nginx.
   - Configuración de red que permite HTTP solo para `10.0.2.2`, `localhost` y `127.0.0.1` durante desarrollo.
   - Producción debe usar HTTPS y actualizar la URL nativa al staging.

3. **Conectividad**
   - `ConnectivityService` expone el estado online/offline con Signals.
   - El catálogo puede consultarse desde la caché; evaluador e historial requieren backend.

## Consecuencias

- **Positivas:** se cumplen las tres plataformas (navegador, PWA y Android), la app es instalable, tiene funcionamiento parcial sin red y el APK se puede generar de forma reproducible.
- **Negativas:** el service worker debe invalidarse al cambiar la versión; la URL nativa requiere configuración por ambiente; el HTTP local no debe usarse en producción.
- **Evidencia:** build de producción con `ngsw-worker.js` y `ngsw.json`, APK debug generado, instalación y login verificados en emulador Android.

## Alternativas consideradas

- **Solo PWA sin Android:** no cumple el requisito mínimo de plataformas.
- **WebView manual:** más trabajo y menos mantenible que Capacitor.
- **Cachear todas las APIs:** riesgo de mezclar datos entre usuarios y sesiones; se descartó.
