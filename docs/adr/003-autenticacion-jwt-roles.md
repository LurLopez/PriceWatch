# ADR-003: Autenticación JWT y autorización por roles

- **Estado:** Aceptado (EF)
- **Fecha:** 2026-11-21
- **Autor:** Lur Lopez Fraile
- **Contexto:** PriceWatch — Comparador Multicriterio Inteligente (OII436-1 PUCV)

## Contexto

La EP1 usaba una autenticación de demostración basada en comparar credenciales contra variables de entorno y emitir un token sin firma ni validación. La entrega final exige autenticación y autorización verificables, protección de rutas, contraseñas almacenadas de forma segura y separación de permisos.

## Decisión

1. Persistir usuarios en PostgreSQL mediante el modelo `User` de Prisma, con `email` único, `passwordHash`, rol (`ADMIN`/`USER`) y estado `active`.
2. Almacenar contraseñas con `bcrypt` (10 rondas); nunca devolver el hash en respuestas ni registrarlo en logs.
3. Emitir JWT firmados con `JWT_SECRET` y expiración configurable (`JWT_EXPIRES_IN`, por defecto `1h`).
4. Validar el token con un `JwtAuthGuard` propio y autorizar con `RolesGuard` + decorador `@Roles`.
5. Proteger:
   - `sources/*`: solo `ADMIN`.
   - `ranking/*`: `USER` y `ADMIN`; el historial se filtra por `userId`, salvo para `ADMIN`.
   - `products/*` y `health`: públicos.
6. En el frontend, usar `authInterceptor` para adjuntar el token, `authGuard` para proteger rutas y limpiar la sesión ante un `401`.
7. Mantener el cierre de sesión del lado del cliente; el token es stateless y expira. Se documenta esta limitación.

## Consecuencias

- **Positivas:** autorización real, contraseñas seguras, trazabilidad del historial por usuario, protección de la fuente externa y una base extensible para refresh tokens o RBAC más fino.
- **Negativas:** se añade una dependencia (`@nestjs/jwt`, `bcryptjs`) y una consulta a usuarios en el login. El logout no invalida el token en el servidor; se mitiga con expiración corta.
- **Migración:** se generaron dos migraciones Prisma. La primera representa el esquema EP1/EP2; la segunda añade usuarios, roles y `ranking_history.user_id`. El entrypoint detecta bases creadas con `db push` y aplica un baseline sin perder datos.

## Alternativas consideradas

- **Cookies HttpOnly:** más seguras frente a XSS, pero complican el uso desde Capacitor y el flujo cross-origin. Se deja como mejora futura.
- **Passport + estrategias:** válido, pero añade más dependencias y configuración para el mismo resultado. Se prefirió un guard propio con `JwtService`.
- **Sesiones en base de datos:** permiten revocación inmediata, pero aumentan la complejidad y las consultas. No se requieren para el alcance actual.
