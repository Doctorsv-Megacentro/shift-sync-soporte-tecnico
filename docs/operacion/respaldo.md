# Runbook — Respaldo

> **Estado: procedimiento listo, todavía no ejecutable.** No existe un proyecto de producción en
> la nube. El primer respaldo y su prueba de restauración son requisitos previos al corte de v1.

## Qué hay que respaldar y qué no

| Dato | ¿Respaldo? | Por qué |
|---|---|---|
| `day_overrides` | **Sí, crítico** | Es el trabajo de jefatura. **No se puede reconstruir desde la hoja**: la hoja no los tiene |
| `conflict_acks` | **Sí** | Decisiones tomadas («aceptado como está») con su nota |
| `people` con `display_name_source='manual'` | **Sí** | Correcciones manuales de nombres que se respetan en cada importación |
| `share_links` | Sí | Enlaces repartidos y vigentes |
| `admins` | Sí | Es corta, pero sin ella nadie entra |
| `imports` y `schedule_entries` | Conveniente | Se pueden reconstruir volviendo a cargar la hoja, si se conserva el archivo |

**La conclusión que importa:** si se pierde la base, el horario se recupera cargando la hoja otra
vez, pero **los cambios de jefatura se pierden para siempre**. Son lo primero que hay que respaldar.

## Respaldo manual

```bash
supabase link --project-ref <ref-produccion>
supabase db dump --remote --role-only -f respaldo-AAAA-MM-DD-roles.sql
supabase db dump --remote -f respaldo-AAAA-MM-DD-schema.sql
supabase db dump --remote --data-only --use-copy -f respaldo-AAAA-MM-DD-data.sql
```

El volcado predeterminado contiene el esquema, pero no los datos ni los roles; por eso se generan
los tres archivos. Guardarlos **fuera del repositorio**: contienen nombres reales
([ADR-0011](../adr/0011-datos-personales-fuera-del-repo.md)). Nunca en `docs/` ni en ninguna ruta
rastreada por git. Conservar una copia cifrada en el almacenamiento aprobado por la organización y
anotar fecha, proyecto, responsable y resultado en el registro operativo.

El plan gratuito no incluye respaldos diarios gestionados. El `pg_dump` externo es, por tanto, el
respaldo recuperable del MVP. Fuente consultada el 2026-11-04:
[Database Backups](https://supabase.com/docs/guides/platform/backups) y
[CLI: db dump](https://supabase.com/docs/reference/cli/supabase-db-dump).

El volcado **no incluye el esquema `auth`**. Varias tablas de `public` referencian `auth.users(id)`
(`imports`, `month_versions`, `day_overrides`, `conflict_acks`, `share_links`). Restaurar los datos
en un proyecto vacío falla si esos UUID no existen.

- **Mismo proyecto, pausado menos de 90 días:** restaurar desde el panel de Supabase. Es el camino
  preferido.
- **Proyecto nuevo:** recrear las cuentas de jefatura (iniciar sesión con Google), anotar el mapa
  correo → UUID nuevo, reescribir esos UUID en el dump de datos y recién entonces cargarlo. No
  reaplicar el dump sobre producción sin esa correspondencia.

## Frecuencia mínima

| Cuándo | Qué |
|---|---|
| Antes de cada migración de producción | `db dump` completo |
| Mensual, al cargar el mes nuevo | `db dump` completo |
| Tras una tanda grande de cambios de jefatura | Al menos las tablas críticas |

Con presupuesto $0, se hace a mano siguiendo esta lista. No se agrega un cron sin acordar primero
dónde guardar y cifrar los archivos.

## Restaurar

```bash
psql "<cadena-de-conexion-desarrollo>" -f respaldo-AAAA-MM-DD-roles.sql
psql "<cadena-de-conexion-desarrollo>" -f respaldo-AAAA-MM-DD-schema.sql
psql "<cadena-de-conexion-desarrollo>" -f respaldo-AAAA-MM-DD-data.sql
```

Probar la restauración **en el proyecto de desarrollo** antes de necesitarla de verdad. Un respaldo
que nunca se ha restaurado no es un respaldo.

## Lista de verificación

1. Confirmar que el archivo no está vacío y está fuera del repositorio.
2. Restaurarlo en el proyecto de desarrollo, nunca encima de producción.
3. Comprobar los conteos de `day_overrides`, `conflict_acks`, correcciones manuales, `share_links`
   y `admins` contra los anotados al crear el respaldo.
4. Abrir la aplicación contra desarrollo y validar un enlace público y una sesión de jefatura.
5. Registrar el resultado; si falla, crear un respaldo nuevo antes de continuar con migraciones o
   con el corte.

## Cómo verificarlo

El último respaldo pasa la lista anterior. Mientras no exista Supabase de desarrollo en la nube, la
prueba puede ensayarse contra el stack local, pero no sustituye la primera restauración del respaldo
real de producción.
