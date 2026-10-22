# Guía breve para entender y demostrar EP2

Esta guía sirve para estudiar la implementación; no sustituye comprenderla ni ejecutar la demostración.

## Explicación corta

> PriceWatch toma una muestra acotada desde una API de demostración, la valida y guarda con su procedencia. El usuario elige una prioridad —ahorro, equilibrio o valoraciones— y el motor MAUT ordena los productos usando solo los criterios presentes en toda la muestra. La interfaz muestra los datos y las limitaciones para no confundir el prototipo con precios reales.

## Flujo técnico

```text
Angular → POST /api/sources/demo-products/search → NestJS
       → POST /sources/demo-products/search → FastAPI → DummyJSON
       ← registros normalizados, conteos y hashes ←
       → PostgreSQL: source_runs + source_listings
Angular → POST /api/ranking/evaluate (source_run_id, context_profile)
       → NestJS carga esa corrida → FastAPI calcula MAUT
       ← ranking, pesos efectivos y criterios usados/omitidos
```

El botón inicia la consulta; abrir la página o mover un slider no llama a DummyJSON. NestJS limita el lote a 20, aplica un cooldown local y valida otra vez el contrato antes de escribir. Python usa URL fija, timeout de 10 s, sin redirecciones ni paginación. No se guardan la respuesta JSON original, imágenes, descripciones o reseñas.

## Qué significa cada perfil

- `economia`: peso inicial alto para precio.
- `equilibrado`: distribuye el peso entre los cuatro criterios.
- `valoraciones`: aumenta el peso de la valoración entregada por la fuente.
- `personalizado`: usa los cuatro sliders.

Los pesos describen la prioridad escogida para esta comparación; no se entrena un modelo ni se almacena un perfil personal. Si DummyJSON no da `specs_score`, esa dimensión se excluye para todos los productos de la muestra y los pesos de las dimensiones restantes se reescalan para sumar 1. El backend responde con `active_criteria`, `ignored_criteria` y `effective_weights` para que el motivo sea visible.

## Demo local

1. Configurar Docker/PostgreSQL. Desde la raíz, copiar `.env.example` a `.env` y habilitar `DEMO_PRODUCTS_SOURCE_ENABLED=true` **solo en local**.
2. Ejecutar `docker compose up --build -d` y comprobar `docker compose ps`, `/api/health` y `/api/docs`.
3. Abrir `http://localhost:4200` → **Evaluador multicriterio** → buscar `laptop` → **Consultar fuente**.
4. Verificar que la tabla informa 5 (o la cantidad recibida) productos, fecha, ID de corrida y métricas. Abrir el detalle de procedencia para ver el ID/hash.
5. Elegir **Ahorro** y luego **Valoraciones**. Comparar el ganador, los criterios usados y los pesos efectivos. La muestra suele devolver otros valores si el proveedor actualiza su conjunto.
6. Revisar historial y/o PostgreSQL:

```sql
SELECT status, query, received, accepted, rejected, duplicates, duration_ms, retrieved_at
FROM source_runs
ORDER BY started_at DESC
LIMIT 5;

SELECT external_id, title, price, currency, content_hash, source_url
FROM source_listings
ORDER BY retrieved_at DESC
LIMIT 10;
```

Si el API falla, la corrida queda `FAILED` con un código seguro. No se debe describir esa prueba como una comparación de mercado ni como una base de precios vigente.

## Limitaciones que hay que explicar

- DummyJSON es explícitamente una fuente de **datos de muestra**; precio, valoración y disponibilidad son sintéticos, y la moneda no está declarada.
- Mercado Libre no se usa: PriceWatch compite potencialmente con sus servicios y no se confirmó permiso. No se eludió el HTTP 403.
- `PLAN-EP2.md` distingue una sonda de FastAPI en memoria de una prueba posterior del flujo NestJS/FastAPI/PostgreSQL, que sí persistió corrida, productos e historial. Reconoce cuál se está demostrando.
- La versión actual incluye el arreglo de `effective_weights` y el timeout visible de la consulta; las imágenes deben reconstruirse para la demo.
- El uso de la bandera de fuente queda restringido al prototipo local porque el endpoint nuevo aún necesita protección de acceso antes de un despliegue público.
- No se hizo un estudio con usuarios; se definieron criterios para evaluarlo más adelante.

## Preguntas para poder explicarlo

1. **¿Por qué no se usan siempre los cuatro criterios?** Para comparar de forma justa, todos los productos deben tener el criterio; un dato ausente no se inventa.
2. **¿Por qué reglas y MAUT en vez de IA entrenada?** No hay datos representativos etiquetados para entrenar y evaluar un modelo; las reglas actuales son reproducibles y explicables.
3. **¿Qué prueba la métrica de aceptados?** Que los registros cumplen el contrato de datos, no que sean reales, exactos o representativos del mercado.
4. **¿Qué falta antes de desplegar la fuente?** Aclarar las condiciones de uso, proteger las rutas y validar la evaluación con usuarios.
