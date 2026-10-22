# PriceWatch — Frontend

Cliente web de PriceWatch construido con **Angular 21 standalone** e **Ionic 9**. Consume la API de NestJS a través de `/api` y ofrece tres vistas: catálogo, evaluador multicriterio e historial.

## Requisitos

- Node.js 22+
- npm 10+
- Backend y motor FastAPI en ejecución (o Docker Compose desde la raíz del repositorio)

## Ejecución local

```bash
npm ci
npm start
```

La aplicación queda en `http://localhost:4200`. El proxy de desarrollo (`proxy.conf.json`) redirige `/api` a `http://localhost:3000`.

## Compilación y pruebas

```bash
npm run lint
npm run build
npm test -- --watch=false
```

El build de producción se genera en `dist/frontend/browser` y es el directorio que usa la imagen Nginx.

## Estructura

```text
src/app/
├── components/navbar/       # Navegación principal
├── models/                  # Contratos TypeScript de la API
├── pages/catalog/           # Catálogo local
├── pages/evaluator/         # Evaluación, perfiles y consulta a DummyJSON
├── pages/history/           # Historial persistido
└── services/api.service.ts  # Cliente HTTP y respaldo local
```

## Variables

El cliente usa rutas relativas (`/api`), por lo que no requiere una URL absoluta en el navegador. Nginx se encarga de redirigir `/api` al backend dentro de Docker Compose.
