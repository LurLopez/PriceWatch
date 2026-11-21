import { Capacitor } from '@capacitor/core';
import { environment } from '../../environments/environment';

/**
 * En navegador/PWA se usa la ruta relativa /api (Nginx hace proxy).
 * En Android/iOS se usa una URL absoluta porque el WebView no tiene proxy.
 */
export function getApiBaseUrl(): string {
  return Capacitor.isNativePlatform() ? environment.apiBaseUrlNative : environment.apiBaseUrl;
}
