# Entrega Parcial 2 — Información web y prototipo adaptativo

**Asignatura:** OII436-1 Ingeniería Web Avanzada · PUCV  
**Proyecto:** PriceWatch  
**Fecha indicada en el plan de asignatura:** 25 de octubre de 2026  
**Estado:** implementación completa y pruebas automatizadas verificadas. El flujo NestJS/FastAPI/PostgreSQL se documenta con datos sintéticos y las imágenes deben reconstruirse para la demostración.

## 1. Requisito del curso y alcance

El plan de asignatura define la EP2 como: extraer y preparar información web de forma trazable y responsable, integrar un prototipo adaptativo o inteligente y definir criterios de evaluación. No exige en el documento entregado un proveedor, un modelo de IA entrenado ni una arquitectura concreta.

PriceWatch mantiene el dominio de comparación de productos. La EP2 añade una adquisición explícita desde una API de demostración, preparación y persistencia auditables y perfiles de decisión basados en reglas/MAUT. La interfaz muestra la procedencia y advierte que los datos de esta API son sintéticos.

## 2. Decisión de fuente y uso responsable

### Fuente del prototipo

- **API:** [DummyJSON — Products](https://dummyjson.com/docs/products).
- **Uso declarado por su documentación:** datos de ejemplo para desarrollo, pruebas y prototipos.
- **Endpoint consultado:** `GET https://dummyjson.com/products/search?q={consulta}&limit={límite}`.
- **Consulta:** solo se ejecuta tras pulsar el botón; límite entre 2 y 20, una petición, sin paginación, timeout de 10 s, redirecciones desactivadas y límite de respuesta de 1 MB.
- **Activación:** `DEMO_PRODUCTS_SOURCE_ENABLED=true`, desactivada por defecto. NestJS añade un cooldown de 15 s por proceso.
- **Datos retenidos por corrida:** ID y título, categoría, marca, precio entregado, valoración de ejemplo, disponibilidad de ejemplo, algunos atributos técnicos, URL del registro, fecha de recuperación y hash SHA-256 de los campos normalizados.
- **Datos descartados:** respuesta JSON original, descripción, imágenes, reseñas y datos de personas incluidos en las reseñas del conjunto de ejemplo.
- **Moneda:** la API no entrega un campo de moneda. PriceWatch no inventa uno; presenta el precio como unidad de muestra y no como una cotización comercial.

DummyJSON se usa como fuente de **prototipado**, no como inventario ni mercado real. Su documentación pública describe los datos como placeholders, no como datos abiertos con una licencia de redistribución explícita. Antes de publicar o reutilizar el contenido fuera del prototipo se deben revisar sus condiciones vigentes.

### Fuente que no se utiliza

El README de EP1 proponía Mercado Libre Chile. No se usa en este prototipo porque los [términos del Programa de Desarrolladores](https://developers.mercadolibre.com.ar/es-ar-terminos-y-condiciones) incluyen restricciones sobre servicios que compitan con los de Mercado Libre; PriceWatch es un comparador. Además, una consulta de comprobación sin autorización respondió HTTP 403. No se intenta sortear la restricción. Una integración futura requiere aclarar el permiso y las condiciones con la fuente y con la asignatura. La [documentación de Ítems y Búsquedas](https://developers.mercadolibre.com.ar/es_ar/items-y-busquedas) advierte además que `available_quantity` en búsquedas es referencial.

## 3. Flujo de datos y trazabilidad

```text
Usuario pulsa “Consultar fuente”
  → Angular envía consulta acotada a NestJS
  → NestJS registra SourceRun y llama a FastAPI
  → FastAPI consulta una página fija de DummyJSON (timeout 10 s)
  → normaliza, valida, deduplica y calcula SHA-256
  → NestJS valida el contrato y guarda SourceRun + SourceListing en PostgreSQL
  → la interfaz compara exclusivamente los productos de esa corrida
```

La consulta no se ejecuta al abrir la aplicación ni al modificar los sliders. No se acepta una URL del usuario. La preparación descarta registros sin ID, título o precio positivo; limita la longitud de textos; conserva nulos en campos opcionales y deduplica por ID externo dentro de la corrida.

La base añade:

- `source_runs`: fuente, búsqueda, estado, marcas temporales, duración, cantidades recibidas/aceptadas/rechazadas/duplicadas y código de error seguro.
- `source_listings`: registros normalizados por corrida, enlace al registro de origen, campos permitidos y hash del contenido normalizado.
- `ranking_history`: perfil aplicado e ID de corrida de origen, además de los pesos y resultado ya existentes.

Las corridas fallidas no generan productos nuevos y no reemplazan el catálogo local. Los registros de la fuente son snapshots de demostración; una corrida no representa un catálogo completo ni garantiza que los datos permanezcan actualizados.

## 4. Prototipo adaptativo

La adaptación es determinista y visible, no un modelo entrenado:

| Perfil | Precio | Valoración | Disponibilidad | Especificaciones |
|---|---:|---:|---:|---:|
| `economia` | 0,70 | 0,10 | 0,15 | 0,05 |
| `equilibrado` | 0,40 | 0,30 | 0,10 | 0,20 |
| `valoraciones` | 0,15 | 0,65 | 0,10 | 0,10 |
| `personalizado` | Ajustable con los cuatro controles de la interfaz | | | |

El contexto es la prioridad escogida para **esta comparación**; no se guarda un perfil personal ni se recogen datos sensibles. Los criterios deben estar disponibles para todos los productos comparados. Si falta un criterio en algún producto, se omite para la muestra completa y los pesos de los demás se renormalizan. La respuesta y la UI muestran los criterios incluidos y omitidos. En los datos de DummyJSON, valoración/disponibilidad son igualmente valores de muestra y las especificaciones no se convierten en una puntuación inventada.

El usuario puede cambiar el perfil, editar los pesos y volver al catálogo local. Si falla el cálculo de una corrida externa, la interfaz **no** sustituye esos resultados por el ranking local sin indicarlo.

## 5. Criterios de evaluación del prototipo

Estos criterios están definidos para poder evaluarlo; las pruebas unitarias no se presentan como una evaluación con usuarios ni como exactitud de mercado.

| Criterio | Medición / condición de aceptación |
|---|---|
| Integridad del lote | `recibidos = aceptados + rechazados + duplicados`; el backend vuelve a validar la igualdad. |
| Calidad de preparación | Conteos de registros válidos, rechazados y duplicados visibles por corrida; ID/hash únicos dentro de cada corrida. |
| Trazabilidad | Cada registro muestra fuente, ID, fecha, URL y hash; el historial conserva el ID de corrida usado para el ranking. |
| Adaptación | Con un conjunto de prueba fijo, `economia` y `valoraciones` pueden cambiar el ganador; los pesos efectivos suman 1 y son visibles. |
| Datos faltantes | Ningún valor faltante se reemplaza por cero; el criterio se excluye y el sistema explica la exclusión. |
| Resiliencia | Timeout, 403, 429 o JSON inválido producen un error controlado; las pruebas de CI usan transporte simulado y no hacen llamadas externas. |
| Control del usuario | La consulta requiere una acción explícita; sliders y perfiles se pueden cambiar; no se persiste información personal del contexto. |
| Utilidad | Criterio definido para una prueba formativa; no se realizó un estudio con usuarios en esta entrega, por lo que no se afirma una mejora de utilidad. |
| Accesibilidad | Navegación por teclado, etiquetas ARIA en los controles y anuncios de estado implementados; la prueba manual con tecnologías de asistencia queda como trabajo futuro. |
| Sesgo de ranking | El nombre de marca no participa en el score; contrastar que cambiar marca sin cambiar atributos no altera el puntaje. Los sesgos de la muestra sintética no representan el mercado. |
| Límite de la fuente | Mostrar en cada comparación que DummyJSON contiene datos sintéticos y que la moneda no está declarada. |

## 6. Pruebas y reproducción

```bash
# Desde la raíz del repositorio, editar .env y habilitar solo para una demo local:
DEMO_PRODUCTS_SOURCE_ENABLED=true

docker compose up --build -d
```

En la pantalla **Evaluador multicriterio**, busca `laptop`, pulsa **Consultar fuente**, y luego cambia entre **Ahorro** y **Valoraciones**. La interfaz muestra los conteos de preparación, fecha/ID de corrida, ganador, puntaje, criterios omitidos y enlace de procedencia. Para evaluar una corrida por API se usa `POST /api/ranking/evaluate` con `source_run_id` y `context_profile`.

La bandera de fuente se deja `false` en CI y por defecto. Las rutas del prototipo no deben exponerse a Internet mientras no tengan autenticación/controles de acceso adecuados. Las pruebas automatizadas usan respuestas sintéticas y no demuestran que el proveedor esté disponible durante una ejecución futura.

### Verificación automatizada del código

| Componente | Resultado local |
|---|---|
| Backend | `npm run build`, `npm run lint` y **13 pruebas Jest** aprobadas; `npm run test:e2e` cubre health y catálogo. |
| Frontend | `npm run build` y **11 pruebas Vitest** aprobadas. |
| FastAPI | **15 pruebas pytest** y `flake8 .` aprobados; queda un aviso de deprecación de AnyIO/Starlette en TestClient. |
| Prisma / Compose | `prisma validate` y `docker compose config -q` aprobados. |
| Integración con stack local | Corrida de fuente y ranking persistidos mediante las rutas HTTP de NestJS; detalle abajo. |
| Diff | `git diff --check` aprobado. |

Las pruebas unitarias validan contratos y reglas con mocks/fixtures. La prueba de integración siguiente sí usó el stack local y PostgreSQL, pero no sustituye una evaluación con usuarios ni valida datos comerciales reales.

### Evidencia de una consulta real al API de demostración

El 22/10/2026 se ejecutó una consulta puntual `laptop`, límite 5, desde el adaptador FastAPI con la bandera habilitada temporalmente en el proceso de prueba:

- Respuesta HTTP: **200**; recibidos 5, aceptados 5, rechazados 0, duplicados 0.
- Recuperación reportada: `2026-10-22T21:11:36.254281+00:00`; duración reportada por el adaptador: **453.781 ms**.
- Evaluación de la misma respuesta en memoria: perfil `economia` recomendó *Lenovo Yoga 920* (83,53/100); perfil `valoraciones` recomendó *Huawei Matebook X Pro* (94,08/100).
- En ambos perfiles se usaron precio, valoración y disponibilidad de muestra; se omitieron especificaciones porque la fuente no las entrega como una puntuación comparable.
- **Alcance:** fue una prueba de la fuente y del motor FastAPI con datos consultados en vivo, no una corrida persistida por NestJS/PostgreSQL. No es una evaluación de precios/stock reales ni una muestra representativa del mercado.

### Evidencia de integración con NestJS y PostgreSQL

El 22/10/2026 se verificó el flujo en el stack que inició el usuario:

- Corrida `01d8dc20-0620-485b-b8bf-922367540aa6`, query `laptop`, estado `SUCCEEDED`.
- 5 recibidos/aceptados, 0 rechazados, 0 duplicados; duración de coordinación **874 ms**.
- `GET /api/sources/demo-products/runs/:id` confirmó los 5 registros guardados.
- `POST /api/ranking/evaluate` con esa corrida devolvió HTTP 201, ganador *Lenovo Yoga 920* (83,53/100), criterios activos precio/valoración/disponibilidad y especificaciones omitidas.
- `GET /api/ranking/history` confirmó el registro asociado a ese `source_run_id`.

Además, se probó el mismo endpoint a través del proxy Nginx usado por el navegador (`http://127.0.0.1:4200/api/sources/demo-products/search`): respondió HTTP 201 y registró la corrida `f45356a3-e378-488b-b1e5-42aaa9dcc93f` con 5/5 aceptados. Esta comprobación fue mediante HTTP desde el host, no una interacción automatizada del navegador.

**Verificación final de la versión entregada (22/10/2026):** con FastAPI y NestJS levantados sobre la base PostgreSQL del proyecto, la corrida `bcf4eb6a-220a-485b-8c21-47fa15d4aecd` registró 5/5 productos de DummyJSON. El perfil `economia` eligió *Lenovo Yoga 920* (83,53/100), con criterios activos precio/valoración/disponibilidad y especificaciones omitidas. El historial confirmó el registro con ese `source_run_id`.

Esta verificación demuestra persistencia del prototipo con datos sintéticos. La versión actual incluye el formato correcto de `effective_weights` y el timeout visible de 20 s en el cliente. Para la demostración, reconstruir las imágenes con `docker compose up --build -d`.

## 7. Límites conocidos y trabajo siguiente

1. La fuente actual sirve datos ficticios de prototipado; no prueba comparación de precios comerciales ni vigencia de stock.
2. La moneda está ausente en la respuesta y no se convierte; no comparar esos valores con CLP del catálogo local.
3. Los perfiles son reglas iniciales, no una preferencia aprendida ni un resultado de estudio de usuarios.
4. La política de acceso/rate limiting del endpoint está limitada a un proceso local; la bandera debe permanecer apagada en staging público hasta proteger las rutas.
5. La fuente sintética se declara como limitación. Si la pauta exige una fuente comercial real, se debe acordar el permiso y las condiciones de uso antes de integrarla.
