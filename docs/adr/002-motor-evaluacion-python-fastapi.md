# ADR-002: Algoritmo de Ponderación Multicriterio MAUT con Normalización Min-Max en FastAPI

- **Estado:** Aceptado (EP1)
- **Fecha:** 2026-09-20
- **Autor:** Lur Lopez Fraile
- **Contexto del Proyecto:** PriceWatch — Comparador Multicriterio Inteligente (OII436-1 PUCV)

---

## 1. Contexto y Problema

PriceWatch busca evitar los ordenamientos unidimensionales típicos (solo por precio más bajo o sólo por popularidad). Para ordenar un catálogo en base a múltiples atributos cualitativos y cuantitativos (precio, calificación del vendedor, stock disponible y especificaciones técnicas), se requiere un método formal de decisión multicriterio que cumpla con:

1. Capacidad de manejar variables de beneficio (mayor es mejor) y variables de costo (menor es mejor).
2. Normalización matemática a una escala común $[0, 1]$ o $[0, 100]$.
3. Soporte para pesos personalizados dinámicos fijados por el usuario ($\sum w_i = 1$).
4. Explicabilidad del resultado para evitar que el algoritmo sea una "caja negra".

---

## 2. Decisión

Se adopta la **Teoría de Utilidad Multiatributo (MAUT)** combinada con normalización **Min-Max** implementada en el microservicio Python/FastAPI:

1. **Variables de Costo (Precio):**
   $$\hat{P}_{\text{precio}} = \frac{\max(\text{precios}) - \text{precio}}{\max(\text{precios}) - \min(\text{precios})}$$
   A menor precio, mayor puntuación relativa.
2. **Variables de Beneficio (Calidad, Stock, Especificaciones):**
   $$\hat{P}_{\text{beneficio}} = \frac{\text{valor} - \min(\text{valores})}{\max(\text{valores}) - \min(\text{valores})}$$
3. **Puntuación Ponderada Final:**
   $$\text{Score}(P) = \sum_{i} w_i \cdot \hat{P}_i \quad \text{con} \quad \sum w_i = 1$$
4. **Explicabilidad:**
   Se calcula la contribución de cada factor al puntaje final y se genera una explicación en lenguaje natural para la alternativa líder y advertencias para artículos con stock cero o crítico.

---

## 3. Consecuencias

### Positivas
- **Matemáticamente defendible y reproducible:** Respeta la teoría de toma de decisiones multicriterio (MCDM/MAUT).
- **Comprensión intuitiva:** Los usuarios visualizan exactamente qué porcentaje aportó el precio, la calidad o el stock.
- **Rendimiento ultra rápido:** El cálculo en Python/Pydantic toma menos de 5 ms para catálogos de cientos de ítems.

### Negativas / Mitigaciones
- **Sensibilidad a valores atípicos (outliers):** Un precio extremadamente alto puede comprimir las puntuaciones del resto.  
  *Mitigación:* Para la EP2 se evaluará la incorporación opcional de normalización robusta con z-score o poda de cuantiles intercuartílicos.
