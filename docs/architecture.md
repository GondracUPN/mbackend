# Arquitectura del backend

El backend es una aplicación NestJS independiente. PostgreSQL es la fuente de verdad y las modificaciones de esquema se realizan únicamente mediante migraciones.

## Aislamiento empresarial

- Cada usuario y cliente pertenece a una empresa.
- Toda consulta funcional se limita al `company_id` contenido en el JWT.
- Un cliente pertenece a la empresa; `created_in_branch_id` conserva únicamente su sede de origen.
- La restricción `UNIQUE (company_id, dni)` impide duplicados incluso bajo concurrencia.

## Historial

- Los registros funcionales usan eliminación lógica mediante `deleted_at`.
- Los clientes con dependencias clínicas o comerciales no podrán eliminarse; cada módulo futuro registrará su verificación en el servicio de Clientes.
- Los cambios de DNI se guardan en `audit_logs` dentro de la misma transacción que la actualización.
- Los consentimientos tienen una tabla versionable separada para incorporarlos sin alterar el registro principal.

## Seguridad

- Autenticación JWT mediante cookie `HttpOnly` o encabezado Bearer.
- Los permisos se expresan con roles persistidos y guards de NestJS.
- El rol Administrador controla DNI, eliminación lógica y restauración.
- En producción, frontend y backend deben desplegarse bajo el mismo dominio registrable para conservar `SameSite=Lax`.
