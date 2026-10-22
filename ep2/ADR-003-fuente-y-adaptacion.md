# ADR-003: fuente web de prototipado y adaptación por contexto

**Estado:** aceptada para el prototipo académico EP2.  
**Fecha:** 22/10/2026.

## Contexto

La EP2 pide extraer/preparar información web de forma trazable y responsable, integrar un prototipo adaptativo/inteligente y definir criterios de evaluación. El plan EP1 proponía Mercado Libre Chile, pero PriceWatch es un comparador y los [términos del Programa de Desarrolladores](https://developers.mercadolibre.com.ar/es-ar-terminos-y-condiciones) contienen restricciones sobre crear servicios que compitan con Mercado Libre. La consulta sin autorización respondió 403. No es apropiado intentar evadir el acceso o dar por concedido el permiso.

## Decisión

1. Para desarrollar y demostrar el flujo técnico se usa **DummyJSON Products Search**, que la documentación describe como datos de ejemplo para pruebas y prototipos. Se identifica siempre como sintético; no se afirma que entregue ofertas comerciales, moneda o stock reales.
2. La fuente queda detrás de `DEMO_PRODUCTS_SOURCE_ENABLED`, apagada por defecto. La consulta es manual, fija al host oficial, con una sola petición, timeout, máximo 20 registros, cooldown local y sin descarga de imágenes ni almacenamiento de la respuesta cruda.
3. NestJS coordina y persiste corridas/listados normalizados; FastAPI valida/prepara los datos y calcula el ranking. La UI compara la corrida seleccionada, informa procedencia y no sustituye silenciosamente una muestra externa fallida por el catálogo local.
4. La adaptación usa perfiles explícitos (`economia`, `equilibrado`, `valoraciones`, `personalizado`) que generan pesos MAUT. Los criterios no disponibles para toda la muestra se omiten y los pesos restantes se renormalizan.
5. La integración con una fuente comercial real queda pendiente de permiso/condiciones compatibles y confirmación de la expectativa docente. No se reutiliza el contenido de Mercado Libre ni de SoloTodo por analogía con el repositorio compañero.

## Alternativas consideradas

- **Mercado Libre Chile:** no elegida hasta aclarar permisos. Sus términos incluyen restricciones sobre servicios competidores y la llamada sin autorización observada devolvió 403.
- **SoloTodo:** no elegida por ahora. El repositorio de referencia documenta que las condiciones de reutilización/publicación seguían pendientes.
- **Scraping de la tienda directamente:** descartado mientras la API de demostración basta para implementar y evaluar el flujo. No se automatizan solicitudes a páginas comerciales.
- **Modelo de ML/generativo:** aplazado. Las reglas/MAUT son reproducibles y explicables; no hay datos representativos etiquetados para entrenar o evaluar un modelo.

## Consecuencias

- El pipeline, la preparación, la persistencia, el ranking adaptativo y sus fallos se pueden probar sin credenciales y sin llamadas externas en CI.
- Los precios/unidades no sirven como cotizaciones reales y la fuente no debe presentarse como catálogo comercial.
- La bandera desactivada por defecto evita llamadas accidentales. Las rutas de fuente todavía requieren controles de acceso antes de habilitarse en un servicio público.
