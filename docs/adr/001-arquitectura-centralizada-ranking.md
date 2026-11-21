# ADR-001: Adopción de Arquitectura Centralizada de Servicios con NestJS como Gateway y FastAPI como Motor Analítico

- **Estado:** Aceptado (EP1)
- **Fecha:** 2026-09-20
- **Autor:** Lur Lopez Fraile
- **Contexto del Proyecto:** PriceWatch — Comparador Multicriterio Inteligente (OII436-1 PUCV)

---

## 1. Contexto y Problema

PriceWatch necesita combinar dos tipos de cargas de trabajo fundamentalmente diferentes:
1. Operaciones transaccionales de aplicación web: consultas de catálogo, filtrado, persistencia de búsquedas, manejo de errores, CORS y validación de esquemas.
2. Cómputo matemático y analítica de datos: normalización vectorial de atributos de productos, ponderación multicriterio lineal y no lineal, y generación de resúmenes explicativos en lenguaje natural.

Se debe decidir cómo estructurar estos componentes para maximizar la mantenibilidad y la escalabilidad sin disparar la complejidad operacional en esta primera fase del proyecto.

---

## 2. Decisión

Se decide implementar una **arquitectura centralizada basada en servicios desacoplados**:
1. **NestJS** será el único punto de entrada público (*BFF / API Gateway*) al que accederá la aplicación cliente (Angular 17+).
2. **FastAPI (Python)** se encapsulará en la red interna de contenedores como un microservicio de cálculo analítico no expuesto públicamente.
3. **PostgreSQL** será gestionado y consultado exclusivamente por NestJS a través de Prisma ORM.

---

## 3. Consecuencias

### Positivas
- **Gobernanza y seguridad centralizadas:** Las políticas de CORS, autenticación, autorización y sanitización de datos se configuran en un único punto (NestJS).
- **Aislamiento de la lógica analítica:** El motor de optimización en Python puede ser probado, actualizado o reemplazado por modelos avanzados en EP2 sin alterar los contratos entre Angular y NestJS.
- **Eficiencia en desarrollo y despliegue:** Uso óptimo de los puntos fuertes de cada ecosistema: TypeScript para la API corporativa y tipado estricto; Python para librerías de analítica, minería y procesamiento matemático.
- **Baja complejidad operacional:** El sistema completo se orquesta con un único manifiesto de Docker Compose en entornos locales y de integración continua.

### Negativas / Mitigaciones
- **Salto de red interno:** Existe una llamada HTTP entre NestJS y FastAPI para calcular rankings.  
  *Mitigación:* Se implementa un tiempo límite estricto (*timeout*) y una lógica de degradación elegante (*fallback*) en NestJS si el microservicio analítico no responde en los milisegundos esperados.
- **Gestión de dos ecosistemas:** Se requiere mantener dependencias en Node.js (npm) y Python (pip).  
  *Mitigación:* El pipeline de CI y los contenedores Docker aíslan de forma hermética cada entorno.
