# Guía de Aprendizaje y Desarrollo Paso a Paso — EP1

> **Asignatura:** OII436-1 Ingeniería Web Avanzada (PUCV)  
> **Proyecto:** PriceWatch — Comparador Multicriterio Inteligente  
> **Autor:** Lur Lopez Fraile  
> **Objetivo:** Comprender la arquitectura web moderna, dominar las tecnologías obligatorias y preparar la defensa técnica individual.

---

## 1. Conceptos Fundamentales de la Web Moderna

### 1.1. ¿Qué es Angular y qué rol cumple el Frontend?
* **Definición:** **Angular** es un framework desarrollado por Google que corre en el navegador web del usuario (o en su teléfono) y permite construir una **Single-Page Application (SPA)**.
* **Diferencia con la web tradicional:** En una web clásica, cada clic recarga la página completa desde el servidor. En Angular, la página se descarga una única vez y el framework redibuja de manera reactiva y ultrarrápida solo la sección de la interfaz que cambia, sin parpadeos de recarga.
* **Piezas clave de Angular:**
  * **Componentes (`.html`, `.css`, `.ts`):** Los bloques visuales de la aplicación (los controles de pesos, el encabezado, las tarjetas de producto).
  * **Servicios (`.service.ts`):** Clases encargadas de la comunicación con el exterior (hacer peticiones HTTP REST a NestJS) y de compartir estado entre componentes.
  * **Capacitor & PWA:** Herramientas que empaquetan la aplicación Angular para instalarse como Progressive Web App en escritorio o generar una app nativa Android.

---

### 1.2. ¿Qué diferencia hay entre "Backend" y "Servicios"?

Esta distinción es crítica tanto para el diseño del sistema como para la defensa docente:

* **El Backend (Concepto Global):** Es **todo lo que ocurre en el servidor**, oculto al usuario final (procesamiento, bases de datos, autenticación, seguridad, APIs).
* **Un Servicio (Nivel Arquitectónico):** Es un **proceso o microservicio independiente** dentro del backend encargado de una función especializada.
* **Un Servicio (Nivel de Código / Framework):** Dentro de NestJS o Angular, es una clase (`.service.ts`) donde se escribe la lógica de negocio para no ensuciar los controladores o componentes (Principio de Responsabilidad Única).

#### La Analogía del Restaurante
| Rol en el Restaurante | Componente en PriceWatch | Tecnología | Función Real |
|---|---|---|---|
| **Comedor y Mesas** | Frontend | Angular + Ionic | El cliente ve la carta, elige opciones y mueve los sliders de preferencia. |
| **Toda la Cocina y Despensa** | Backend General | Red de Contenedores | Todo el entorno servidor que procesa las solicitudes. |
| **Jefe de Cocina** | Backend Principal (Gateway) | NestJS (Node.js) | Único que recibe comandas del comedor, valida que no falte nada y coordina a los demás. |
| **Especialista en Repostería** | Servicio Analítico | Python (FastAPI) | No habla con clientes; recibe los ingredientes del jefe de cocina, aplica la fórmula matemática y entrega el ranking. |
| **La Despensa** | Base de Datos | PostgreSQL (Prisma) | Almacena los productos, usuarios e histórico de evaluaciones de forma persistente. |

---

### 1.3. ¿Por qué combinar NestJS (Node.js) con Python (FastAPI)?

En la industria se denomina **arquitectura de servicios desacoplados**:
1. **NestJS (TypeScript):** Excelente para gestionar miles de conexiones concurrentes de usuarios, exponer la API REST, autenticar con JWT, validar DTOs y generar contratos Swagger interactivos.
2. **Python:** Es el estándar mundial en ciencia de datos, inteligencia artificial y cálculo matemático.
3. **Aislamiento:** Si el algoritmo de optimización matemática consume mucho procesador o tarda unos segundos, corre en su propio contenedor y jamás congela la API de NestJS ni la navegación del usuario.

---

## 2. Flujo de Comunicación de Extremo a Extremo

```text
[ 1. Navegador del Usuario ]
       Angular 18 SPA (Puerto 4200)
             |
             |  POST /api/ranking/evaluate (Vector de pesos en JSON)
             v
[ 2. API Gateway ]
       NestJS REST API (Puerto 3000)
         |               \
         | Valida DTO     | Reenvía payload a red interna
         v                v
[ 3. Base de Datos ]    [ 4. Servicio de Cómputo ]
  PostgreSQL 16           Python + FastAPI (Puerto 8000)
  (Prisma ORM :5432)      - Normalización Min-Max
  Persiste evaluación     - Utilidad multiatributo MAUT
                          - Genera texto explicativo y alertas
                                  |
                                  | Retorna ranking ordenado
                                  v
                        NestJS consolida la respuesta
                                  |
                                  v
                        Angular actualiza la vista
```

---

## 3. Ruta de Construcción Paso a Paso (Fase 1 a 6)

### Fase 1: Fundaciones y Git
1. Inicializar repositorio con dos ramas principales: `main` (código estable y tags de entrega) y `develop` (desarrollo continuo).
2. Configurar `.gitignore` para excluir estrictamente:
   * `node_modules/`
   * `__pycache__/` y `.venv/`
   * `.angular/` y `dist/`
   * Archivos `.env` con credenciales locales.
3. Escribir `CONTRIBUTING.md` para estandarizar commits convencionales (`feat: ...`, `fix: ...`).

---

### Fase 2: El Motor Analítico en Python (`python-service/`)
1. **Modelos con Pydantic (`main.py`):**
   * Definir `ProductInput` con `price`, `quality_rating`, `stock`, `specs_score`.
   * Definir `WeightVector` con los pesos numéricos (de 0.0 a 1.0).
2. **Algoritmo MAUT (Multi-Attribute Utility Theory):**
   * **Criterio de Costo (Precio):** Menor precio $\rightarrow$ mayor puntaje:
     $$\text{NormPrice} = \frac{\max(\text{precios}) - \text{precio}}{\max(\text{precios}) - \min(\text{precios})}$$
   * **Criterios de Beneficio (Calidad, Stock, Especificaciones):** Mayor valor $\rightarrow$ mayor puntaje:
     $$\text{NormValue} = \frac{\text{valor} - \min(\text{valores})}{\max(\text{valores}) - \min(\text{valores})}$$
   * **Puntaje Global:** Suma ponderada normalizada ($\sum w_i = 1$).
3. **Endpoints de FastAPI:**
   * `GET /health`: Comprobación de estado del servicio.
   * `POST /evaluate`: Recibe la lista de productos y pesos, y entrega el ranking ordenado con la justificación del ganador.
4. **Pruebas Automatizadas:** Crear pruebas unitarias con `pytest` en `tests/test_evaluator.py` para validar casos normales y casos límite (ej. pesos que no suman nada o productos con stock cero).

---

### Fase 3: Persistencia y Backend Principal (`backend/`)
1. **Base de Datos con Prisma ORM (`prisma/schema.prisma`):**
   * Modelar la tabla `Product` con sus columnas relacionales.
   * Modelar la tabla `RankingHistory` para auditar qué evaluaciones se realizaron.
   * Ejecutar la migración inicial (`prisma migrate deploy`).
2. **Estructura Modular de NestJS:**
   * `HealthController (`GET /api/health`):` Verifica que NestJS, Postgres y FastAPI estén operando.
   * `ProductsModule (`GET /api/products`):` Consulta el catálogo a PostgreSQL usando `PrismaService`.
   * `RankingModule (`POST /api/ranking/evaluate`):` Valida la petición con `EvaluateRankingDto`, llama a FastAPI mediante `HttpService` (Axios) con timeout de 5 segundos y fallback elegante.
   * `AuthModule (`POST /api/auth/login`):` Autenticación básica con validación de credenciales y retorno de token Bearer.
3. **Documentación Swagger (`main.ts`):**
   * Configurar `DocumentBuilder` para que la documentación interactiva OpenAPI esté disponible en `http://localhost:3000/api/docs`.

---

### Fase 4: Frontend Multiplataforma (`frontend/`)
1. **Componentes Standalone en Angular:**
   * `weight-controls`: Sliders deslizantes para que el usuario ajuste los pesos (Precio, Calidad, Stock, Especificaciones).
   * `product-list`: Renderizado del catálogo con badges de nivel (*"Altamente Recomendado"*), desglose porcentual de puntuación y tarjeta destacada con la explicación del ganador.
2. **Servicio Angular (`pricewatch.service.ts`):**
   * Consume la API relativa `/api` usando `HttpClient`.
   * Si la API estuviera desconectada, activa un catálogo local de respaldo para que la interfaz nunca se rompa.
3. **Multiplataforma y PWA:**
   * `public/manifest.webmanifest`: Configuración PWA para instalación en navegador.
   * `capacitor.config.ts`: Configuración para empaquetado móvil Android.
   * `nginx.conf`: Configuración del servidor Nginx para producción con proxy inverso de `/api/` hacia `backend:3000`.

---

### Fase 5: Contenerización con Docker Compose
1. **`frontend/Dockerfile`:** Construcción multi-stage: compila Angular en Node 20 y copia el bundle resultante a una imagen ultraligera de Nginx.
2. **`backend/Dockerfile`:** Construcción multi-stage: genera Prisma, compila TypeScript y corre en Node 20 Alpine.
3. **`python-service/Dockerfile`:** Imagen Python 3.12 Slim ejecutando Uvicorn en el puerto 8000.
4. **`docker-compose.yml`:** Orquesta los 4 servicios en la red `pricewatch-net`, declara el volumen persistente `postgres_data` y configura los healthchecks.

---

### Fase 6: DevSecOps y Calidad (`.github/workflows/ci.yml`)
Automatizar los siguientes Quality Gates en GitHub Actions:
1. **Frontend:** `npm ci`, `npm run build`, `npm audit --omit=dev --audit-level=critical`.
2. **Backend:** `npm ci`, `npx prisma generate`, `npm test`, `npm run build`.
3. **Python:** `flake8` (linting estático), `pytest -v` (pruebas unitarias).
4. **Terraform (`infra/`):** `terraform fmt -check`, `terraform init`, `terraform validate`.
5. **Seguridad:** Escaneo de secretos en el código con `gitleaks-action`.
6. **Docker Build:** Construye las imágenes Docker solo si todas las pruebas anteriores fueron exitosas.

---

## 4. Demostración Mínima de la EP1 (Pauta de Evaluación Oficial)

Durante la corrección docente se deben demostrar los siguientes 7 puntos (pág. 34 del PDF):

1. **Ejecución con Docker Compose:**
   ```bash
   docker compose up --build
   ```
2. **Navegación en el frontend:** Abrir [http://localhost:4200](http://localhost:4200).
3. **Solicitud desde Angular hacia NestJS:** Mover un slider y observar en la pestaña *Network* del navegador la petición `POST /api/ranking/evaluate`.
4. **Comunicación desde NestJS hacia FastAPI:** NestJS consulta `http://python-service:8000/evaluate` y recibe el cálculo del ranking.
5. **Conexión de NestJS con PostgreSQL:** Comprobar que los productos provienen de PostgreSQL y que las evaluaciones quedan guardadas.
6. **Ejecución del pipeline en GitHub Actions:** Mostrar en GitHub que el workflow corre con todos los checks en verde.
7. **Evidencia de fallo controlado / Quality Gate:**
   * Si FastAPI cae, NestJS no se bloquea y activa el fallback de contingencia.
   * Si se envían pesos inválidos, la API retorna `HTTP 400 Bad Request` controlado.
   * Si se introduce un fallo en una prueba unitaria, GitHub Actions bloquea la construcción de las imágenes Docker.

---

## 5. Preguntas Clave para la Defensa Técnica Individual

* **¿Por qué usas NestJS en lugar de Express clásico?**  
  *Respuesta:* Porque NestJS impone una arquitectura modular y tipada con TypeScript, inyección de dependencias, validación DTO automática y soporte nativo para Swagger, ideal para aplicaciones empresariales.
* **¿Por qué FastAPI corre en Python y no dentro de Node.js?**  
  *Respuesta:* Por especialización arquitectónica. Python ofrece el ecosistema estándar para analítica de datos, algoritmos multicriterio y en la EP2 permitirá integrar procesamiento y web scraping ético sin sobrecargar la API principal.
* **¿Qué pasaría si el contenedor de Python deja de responder?**  
  *Respuesta:* NestJS implementa un timeout estricto de 5 segundos y un bloque de captura de errores que degrada el servicio controladamente sin colgar la conexión ni exponer trazas internas al usuario.
* **¿Por qué usas Prisma en lugar de escribir SQL a mano?**  
  *Respuesta:* Porque Prisma genera tipos TypeScript automáticos a partir del esquema, previene inyecciones SQL mediante consultas parametrizadas y gestiona el versionado de migraciones de base de datos de manera reproducible.
