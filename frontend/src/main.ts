import { bootstrapApplication } from '@angular/platform-browser';
import { Capacitor } from '@capacitor/core';
import { appConfig } from './app/app.config';
import { App } from './app/app';

// En Android/iOS no se usa el service worker de la PWA: el WebView ya sirve
// los archivos locales y una caché antigua puede dejar la app en blanco.
if (
  Capacitor.isNativePlatform() &&
  typeof navigator !== 'undefined' &&
  'serviceWorker' in navigator
) {
  navigator.serviceWorker
    .getRegistrations()
    .then((registrations) =>
      Promise.all(registrations.map((registration) => registration.unregister())),
    )
    .catch(() => undefined);
}

bootstrapApplication(App, appConfig).catch((err) => console.error(err));
