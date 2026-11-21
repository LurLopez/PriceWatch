# Evaluación de la capacidad adaptativa — PriceWatch

## 1. Pregunta

¿La adaptación por perfiles produce decisiones distintas y explicables frente a una versión base, sin usar datos personales ni la marca como señal?

## 2. Metodología

- **Dataset fijo:** 8 laptops sintéticas con precio, valoración, stock y especificaciones.
- **Versión base:** pesos iguales (0.25 cada criterio), sin perfil.
- **Perfiles evaluados:** `economia`, `equilibrado`, `valoraciones`.
- **Motor:** función `evaluate_ranking` del servicio FastAPI, la misma que usa NestJS.
- **Repetición:** el script es determinista; no llama a Internet.
- **Métricas:**
  - Ganador y puntaje.
  - Solapamiento del top-3 con la base.
  - Correlación de rangos de Spearman contra la base.
  - Criterios activos/omitidos y pesos efectivos.
  - Tiempo de cálculo.
- **Sesgo:** se repite la evaluación cambiando solo la marca por “Marca X”.
- **Datos faltantes:** se elimina `specs_score` de un producto y se verifica que el criterio se omita para toda la muestra.

Script: `python-service/evaluation/compare_profiles.py`  
Resultados crudos: `python-service/evaluation/results.json`

## 3. Resultados

| Perfil | Ganador | Puntaje | Top-3 con base | Spearman | Criterios omitidos | Tiempo (ms) |
|---|---|---:|---:|---:|---|---:|
| base (0.25 cada uno) | Acer Aspire 3 | 84,12 | 3/3 | 1,0000 | — | 0,252 |
| economia | Acer Aspire 3 | 95,45 | 2/3 | 0,9524 | — | 0,168 |
| equilibrado | Acer Aspire 3 | 84,55 | 2/3 | 0,9524 | — | 0,170 |
| valoraciones | MacBook Air M2 | 79,72 | 1/3 | 0,2143 | — | 0,164 |

### Pesos efectivos

- **economia:** precio 0,70; valoración 0,10; disponibilidad 0,15; especificaciones 0,05.
- **equilibrado:** precio 0,40; valoración 0,30; disponibilidad 0,10; especificaciones 0,20.
- **valoraciones:** precio 0,15; valoración 0,65; disponibilidad 0,10; especificaciones 0,10.

### Sesgo de marca

- Puntajes idénticos al cambiar solo la marca: **True**.
- Diferencias: **ninguna**.
- Conclusión: la marca no participa en el score; el cambio de ganador se explica por los pesos, no por el nombre.

### Datos faltantes

- Criterios activos: `price`, `quality`, `stock`.
- Criterios omitidos: `specs`.
- Pesos efectivos: 0,3333 / 0,3333 / 0,3333 / 0,0.
- Conclusión: el criterio sin datos se omite para toda la muestra y los pesos restantes se renormalizan; no se reemplaza por cero.

## 4. Interpretación

- La base y los perfiles `economia`/`equilibrado` eligen Acer Aspire 3, pero con distinto puntaje y distinto top-3.
- `valoraciones` cambia el ganador a MacBook Air M2 y reduce el solapamiento del top-3 a 1/3; la correlación de Spearman baja a 0,2143.
- La adaptación es **verificable**: el usuario ve los pesos efectivos, los criterios usados/omitidos y la explicación.
- La diferencia no implica “mejor” en términos absolutos: depende de la prioridad declarada por el usuario. No se afirma una mejora de utilidad sin un estudio con usuarios.

## 5. Limitaciones

- Dataset sintético y pequeño; no representa el mercado.
- No se realizó una prueba A/B ni un estudio con usuarios.
- No hay ground truth de “producto correcto”; se miden cambios de ranking y transparencia, no precisión comercial.
- Los perfiles son reglas, no un modelo entrenado.
- La muestra no incluye datos personales; el contexto se usa solo para la comparación.

## 6. Reproducción

```bash
cd python-service
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt -r requirements-dev.txt
python evaluation/compare_profiles.py
pytest -q
```

## 7. Evidencia

- 4 pruebas específicas en `python-service/tests/test_evaluation.py`.
- `results.json` generado por el script.
- Tabla anterior obtenida el 21/11/2026.
