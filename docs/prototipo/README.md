# Prototipo de interfaz — PriceWatch EF

Este directorio contiene las capturas reales de la aplicación y un visor HTML
para recorrerlas. Sirven como frames de referencia para el prototipo en Figma.

## Ver el prototipo local

Abrir `docs/prototipo/index.html` en el navegador. También se puede servir con:

```bash
python3 -m http.server 8090 --directory docs/prototipo
# http://localhost:8090
```

Pantallas:

- `login.png` — inicio de sesión.
- `evaluator.png` — evaluador multicriterio con ranking explicado.
- `catalog.png` — catálogo de productos.
- `history.png` — historial de evaluaciones.
- `evaluator-mobile.png` — vista móvil.

## Crear el archivo Figma (paso manual)

Figma requiere una cuenta y un archivo propiedad del equipo; no se puede crear
desde el repositorio sin credenciales. Pasos:

1. Crear una cuenta gratuita en <https://www.figma.com>.
2. Crear un archivo llamado **PriceWatch — Prototipo EF**.
3. Arrastrar `login.png`, `evaluator.png`, `catalog.png` e `history.png` al
   lienzo. Opcional: usar `evaluator-mobile.png` para el frame móvil.
4. Convertir cada captura en un frame (clic derecho → “Frame selection”) y
   nombrarlos `Login`, `Evaluador`, `Catálogo`, `Historial`.
5. En la pestaña **Prototype**, enlazar:
   - Login → Evaluador (botón “Ingresar”).
   - Evaluador → Catálogo (menú “Catálogo”).
   - Catálogo → Historial (menú “Historial”).
   - Historial → Evaluador (menú “Evaluador”).
6. Compartir con **Anyone with the link can view**.
7. Pegar el enlace en el README y en `docs/prototipo/README.md`.

## Enlace Figma

- **Pendiente:** agregar aquí el enlace público creado por el equipo.
- Mientras tanto, el prototipo navegable funcional es la propia aplicación en
  `http://localhost:4200` y el visor `index.html`.

## Nota para la defensa

El prototipo no es solo una maqueta: la aplicación implementada permite iniciar
sesión, cambiar perfiles, evaluar, consultar el catálogo y ver el historial. Las
capturas documentan el estado real de la interfaz para la revisión docente.
