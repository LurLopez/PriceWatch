# ADR-005: Componentes Ionic y formularios reactivos

- **Estado:** Aceptado (EF)
- **Fecha:** 2026-11-21
- **Autor:** Lur Lopez Fraile
- **Contexto:** PriceWatch — Comparador Multicriterio Inteligente (OII436-1 PUCV)

## Contexto

La base Angular usaba HTML/CSS propio y `ngModel`. El enunciado exige Ionic Framework como biblioteca de componentes y formularios reactivos para el ingreso y validación de datos. Además, la interfaz debía mantener el diseño responsive y la accesibilidad.

## Decisión

1. **Ionic real**
   - `ion-header`/`ion-toolbar` en la navegación.
   - `ion-card`/`ion-card-content` en login, catálogo e historial.
   - `ion-input`, `ion-select`, `ion-range`, `ion-button`, `ion-badge`, `ion-spinner` e `ion-note` en el evaluador y formularios.
   - `IonApp` como contenedor raíz.
   - CSS base de Ionic importado en `styles.css`.

2. **Formularios reactivos**
   - Login con `FormBuilder.nonNullable.group`, validadores `required`/`email` y mensajes de error.
   - Catálogo con `FormControl` para la búsqueda.
   - Evaluador con `FormGroup` para consulta, perfil y cuatro pesos; los sliders usan `formControlName` y el perfil se sincroniza con `patchValue` sin emitir eventos.
   - Botones con `type="button"` para evitar envíos accidentales del formulario.

3. **Detección de cambios**
   - Se añadió `zone.js` y `provideZoneChangeDetection({ eventCoalescing: true })` para que las respuestas HTTP actualicen las propiedades de los componentes de forma consistente.
   - El estado de autenticación, conectividad y PWA usa Signals.

4. **Accesibilidad y responsive**
   - Etiquetas Ionic (`label`, `labelPlacement`) y `aria-label` en sliders.
   - Mensajes con `aria-live`.
   - Contenedores con `min-width: 0` para evitar desbordes; tabla de ranking con scroll horizontal.
   - Contraste ajustado en inputs, labels y botones.

## Consecuencias

- **Positivas:** se cumplen los requisitos explícitos de Ionic y formularios reactivos; la UI es consistente en web, PWA y Android; los formularios validan antes de llamar a la API.
- **Negativas:** el bundle inicial crece por Ionic; se mitigó con componentes standalone y se mantiene bajo el presupuesto de 1 MB. `zone.js` añade peso, pero simplifica la detección de cambios en componentes con estado mutable.
- **Evidencia:** build de producción, 27 pruebas Vitest, capturas de login/evaluador en navegador y Android, y prueba manual de login en emulador.
