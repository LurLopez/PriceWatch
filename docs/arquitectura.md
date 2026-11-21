# Justificación Arquitectónica y Atributos de Calidad — EP1

> **Asignatura:** Ingeniería Web Avanzada (`OII436-1`) — Profesora: Sandra Cano (PUCV)  
> **Proyecto:** PriceWatch — Comparador Multicriterio Inteligente  
> **Hito:** Entrega Parcial 1 (Arquitectura, CI/CD e Infraestructura)

---

## 1. Contexto y Objetivos del Sistema

PriceWatch es una plataforma diseñada para que los usuarios evalúen y clasifiquen productos comerciales no solo por su precio nominal, sino ponderando simultáneamente variables técnicas, de calidad, stock y restricciones contextuales.

En esta primera etapa (EP1), el objetivo arquitectónico es:
1. Proporcionar una base modular, desacoplada y fácilmente extensible para la futura incorporación de fuentes de scraping en EP2.
2. Centralizar la gobernanza de datos y la seguridad mediante una API corporativa (NestJS).
3. Aislar la lógica analítica de optimización multicriterio en un microservicio de cálculo intensivo (Python / FastAPI).
4. Ofrecer una experiencia reactiva en navegador mediante componentes modernos de Angular 17+.

---

## 2. Drivers Arquitectónicos (Atributos de Calidad)

Conforme a la metodología impartida en la cátedra, la selección de la arquitectura se fundamenta en cinco atributos de calidad priorizados:

1. **Mantenibilidad (Peso: 25%):**  
   Facilidad para modificar, corregir o extender componentes sin generar efectos colaterales. Es vital aislar el algoritmo de scoring del código de presentación y del acceso a datos, de modo que en EP2 el motor de scraping y adaptación evolucione independientemente.
2. **Complejidad Operacional (Peso: 25%):**  
   Esfuerzo requerido para configurar, desplegar, monitorear y mantener el sistema. Para un equipo pequeño y entornos académicos/staging, una proliferación excesiva de microservicios distribuidos genera sobrecarga desproporcionada de red y depuración.
3. **Escalabilidad (Peso: 20%):**  
   Capacidad de absorber incrementos en el volumen de consultas de ranking y en la cantidad de productos evaluados sin degradar el tiempo de respuesta.
4. **Seguridad y Trazabilidad (Peso: 15%):**  
   Superficie de ataque minimizada. El cliente web nunca debe acceder de manera directa a la base de datos ni a los motores internos de cálculo; todas las peticiones deben pasar por un único punto de validación y sanitización.
5. **Disponibilidad y Tolerancia a Fallos (Peso: 15%):**  
   Capacidad de continuar ofreciendo el catálogo de productos incluso si el servicio analítico experimenta latencia o reinicios, aplicando estrategias de degradación elegante.

---

## 3. Comparativa de Alternativas Arquitectónicas

Se evaluaron dos estilos arquitectónicos candidatos para resolver el caso de estudio de PriceWatch:

* **Alternativa A: Microservicios Distribuidos Puros** (Frontend $\rightarrow$ API Gateway $\rightarrow$ Servicio Productos $\rightarrow$ Servicio Ranking $\rightarrow$ Servicio Auth $\rightarrow$ BDs separadas).
* **Alternativa B: Arquitectura Centralizada de Servicios Especializados** (Frontend SPA $\rightarrow$ Backend NestJS Modular $\rightarrow$ Motor Analítico FastAPI + PostgreSQL).

### Matriz de Evaluación Ponderada

| Driver Arquitectónico | Ponderación | Alternativa A: Microservicios Puros | Alternativa B: Servicios Especializados (Seleccionada) |
|---|:---:|:---:|:---:|
| **Mantenibilidad** | 25% | 4 (Alta independencia, pero contratos distribuidos) | **5** (Separación clara de responsabilidades con menor sobrecarga) |
| **Complejidad Operacional** | 25% | 2 (Excesivos pipelines, mallas de red y monitoreo) | **5** (Despliegue unificado y predecible con Docker Compose) |
| **Escalabilidad** | 20% | 5 (Escalamiento granular de cada servicio) | **4** (El motor Python escala de forma independiente a la API) |
| **Seguridad** | 15% | 4 (Múltiples perímetros de red) | **4** (Punto de entrada único, base de datos y motor en red privada) |
| **Disponibilidad** | 15% | 4 (Aislamiento de fallas por nodo) | **4** (NestJS maneja fallos y provee respuestas en caché) |
| **Puntaje Ponderado Total** | **100%** | **3.70 / 5.0** | **4.50 / 5.0** |

---

## 4. Decisión Adoptada y Justificación

Se adopta la **Alternativa B (Arquitectura Centralizada de Servicios Especializados)**:
- **NestJS** actúa como el núcleo orquestador y *BFF (Backend for Frontend)*, exponiendo una API REST canónica (`/api`), administrando la persistencia en PostgreSQL mediante Prisma ORM y controlando CORS, validaciones de esquemas (DTOs) y autenticación futura.
- **FastAPI (Python)** opera como un servicio de cómputo matemático especializado sin estado (*stateless*), dedicado exclusivamente a la normalización vectorial de atributos, cálculo de funciones de utilidad y generación de explicaciones semánticas.
- **Angular 17+** consume exclusivamente los endpoints de NestJS, garantizando que ninguna lógica de persistencia o credenciales quede expuesta en el navegador del cliente.

Esta decisión optimiza el balance entre **máxima mantenibilidad** y **baja complejidad operacional**, permitiendo al equipo concentrarse en la robustez algorítmica y la experiencia de usuario sin incurrir en los sobrecostos de una red distribuida masiva.
