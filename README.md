# Backend — Sistema de Óptica

API independiente construida con NestJS 11, TypeORM 1 y PostgreSQL. Incluye autenticación JWT, aislamiento por empresa, sucursales, roles, auditoría y el módulo de Clientes.

## Requisitos

- Node.js 24 o una versión LTS compatible.
- PostgreSQL 15+ o una base de datos Neon.
- npm 11+.

## Configuración

1. Copiar `.env.example` como `.env`.
2. Configurar `DATABASE_URL`, `JWT_SECRET` y una contraseña inicial segura.
3. Aplicar el esquema y crear los datos iniciales:

```bash
npm install
npm run migration:run
npm run seed
```

4. Iniciar el servidor:

```bash
npm run start:dev
```

La API queda disponible en `http://localhost:4000/api` y Swagger en `http://localhost:4000/docs`.

## Comandos de calidad

```bash
npm run lint
npm test -- --runInBand
npm run build
npm audit --omit=dev
```

## Seguridad operativa

- No usar `synchronize: true`; todos los cambios deben ser migraciones revisadas.
- No confirmar archivos `.env` ni credenciales.
- En producción, usar `COOKIE_SECURE=true`, HTTPS y un `JWT_SECRET` aleatorio de al menos 32 caracteres.
- Frontend y backend deberían compartir el mismo dominio registrable para utilizar cookies `SameSite=Lax`.

La explicación de decisiones estructurales está en [docs/architecture.md](docs/architecture.md).
